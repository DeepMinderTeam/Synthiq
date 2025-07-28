import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

interface QuizGenerationRequest {
  paperId: string
  options: {
    // 목적별 카테고리
    purpose: 'learning' | 'research'
    categories: string[]
    
    // 퀴즈 설정
    questionCount: number
    difficulty: 'easy' | 'medium' | 'hard'
    questionTypes: string[]
    
    // 추가 설정
    timeLimit?: number
    focusPages?: number[]
  }
}

interface GeneratedQuiz {
  quiz_type: string
  quiz_question: string
  quiz_choices?: string[]
  quiz_answer: string
  quiz_explanation: string
  content_index: number
  quiz_category?: string // 카테고리 정보 추가
}

export async function POST(request: NextRequest) {
  try {
    const { paperId, options }: QuizGenerationRequest = await request.json()
    console.log('퀴즈 생성 요청:', { paperId, options })

    // 1. 논문 내용 가져오기
    let query = supabase
      .from('paper_contents')
      .select('*')
      .eq('content_paper_id', parseInt(paperId))
      .order('content_index', { ascending: true })

    // 특정 페이지가 선택된 경우 필터링
    if (options.focusPages && options.focusPages.length > 0) {
      query = query.in('content_index', options.focusPages)
    }

    const { data: paperContents, error: contentError } = await query

    if (contentError) {
      console.error('논문 내용 조회 오류:', contentError)
      return NextResponse.json({ error: '논문 내용을 불러올 수 없습니다.' }, { status: 500 })
    }

    console.log('조회된 논문 내용:', paperContents?.length || 0, '개')

    if (!paperContents || paperContents.length === 0) {
      return NextResponse.json({ error: '선택된 페이지에 내용이 없습니다.' }, { status: 404 })
    }

    // 2. 논문 제목 가져오기
    console.log('논문 ID로 조회:', paperId)
    
    const { data: paper, error: paperError } = await supabase
      .from('paper')
      .select('paper_title, paper_abstract')
      .eq('paper_id', paperId)
      .single()

    if (paperError) {
      console.error('논문 정보 조회 오류:', paperError)
      
      // 논문이 없는 경우, paper 테이블의 모든 레코드를 확인
      const { data: allPapers, error: allPapersError } = await supabase
        .from('paper')
        .select('paper_id, paper_title')
        .limit(5)
      
      console.log('전체 논문 목록 (최대 5개):', allPapers)
      
      return NextResponse.json({ 
        error: '논문 정보를 불러올 수 없습니다.',
        details: paperError.message,
        availablePapers: allPapers
      }, { status: 500 })
    }

    console.log('논문 정보:', paper)

    // 3. AI에게 퀴즈 생성 요청
    const quizPrompt = generateQuizPrompt(paper, paperContents, options)
    
    // 실제 AI API 호출 (예: OpenAI, Claude 등)
    // 환경 변수가 없으면 더미 데이터 사용
    let generatedQuizzes
    if (!process.env.OPENAI_API_KEY) {
      console.log('OpenAI API 키가 없어서 더미 데이터를 사용합니다.')
      generatedQuizzes = generateDummyQuizzes(options, paperContents)
    } else {
      generatedQuizzes = await generateQuizzesWithAI(quizPrompt, options, paperContents)
    }

    console.log('생성된 퀴즈:', generatedQuizzes.length, '개')

    // 4. 생성된 퀴즈를 데이터베이스에 저장
    const savedQuizzes = await saveQuizzesToDatabase(paperId, generatedQuizzes)

    console.log('저장된 퀴즈:', savedQuizzes.length, '개')

    // 5. 테스트 생성
    const { data: test, error: testError } = await supabase
      .from('paper_tests')
      .insert({
        test_paper_id: parseInt(paperId),
        test_title: `${new Date().toLocaleDateString()} AI 퀴즈`
      })
      .select()
      .single()

    if (testError) {
      console.error('테스트 생성 오류:', testError)
      return NextResponse.json({ error: '테스트 생성에 실패했습니다.' }, { status: 500 })
    }

    console.log('생성된 테스트:', test)

    // 6. 테스트 아이템 생성
    const testItems = savedQuizzes.map(quiz => ({
      item_test_id: test.test_id,
      item_quiz_id: quiz.quiz_id
    }))

    const { error: itemsError } = await supabase
      .from('paper_test_items')
      .insert(testItems)

    if (itemsError) {
      console.error('테스트 아이템 생성 오류:', itemsError)
      return NextResponse.json({ error: '테스트 아이템 생성에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      testId: test.test_id,
      quizCount: savedQuizzes.length 
    })

  } catch (error) {
    console.error('퀴즈 생성 오류:', error)
    return NextResponse.json({ error: '퀴즈 생성 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

function generateQuizPrompt(paper: any, contents: any[], options: any): string {
  const { purpose, categories, questionCount, difficulty, questionTypes, focusPages } = options
  
  // 기존 API 호환성을 위한 기본값 설정
  const defaultPurpose = purpose || 'learning'
  const defaultCategories = categories || ['definition']
  const defaultQuestionTypes = questionTypes || ['multiple_choice']
  
  // 목적별 카테고리 설명
  const purposeDescription = defaultPurpose === 'learning' 
    ? '일반 학습용 (학부생 수준의 개념 이해)'
    : '논문 학습용 (연구 논문 심화 분석)'
  
  // 카테고리 설명
  const categoryDescriptions: Record<string, string> = {
    // 일반 학습용
    definition: '핵심 개념과 정의에 대한 이해',
    mechanism: '작동 원리와 시스템 구조 파악',
    application: '실제 적용 사례와 활용법',
    comparison: '다양한 방법론과 접근법 비교',
    problem_solving: '실제 문제 상황에서의 해결 능력',
    
    // 논문 학습용
    motivation: '연구의 배경과 필요성',
    related_work: '기존 연구와의 차별점',
    method: '제안된 방법과 기술적 세부사항',
    experiment: '실험 설계와 성능 평가',
    limitation: '연구의 한계점과 개선 방향',
    summary: '전체 연구의 핵심 내용',
    critical_thinking: '연구의 타당성과 개선점 분석'
  }
  
  // 퀴즈 유형 설명
  const questionTypeDescriptions: Record<string, string> = {
    multiple_choice: '4지선다 객관식 문제',
    ox_quiz: '참/거짓 판단 문제',
    short_answer: '핵심 키워드 답변',
    essay: '상세한 설명 요구',
    code_understanding: '코드 분석 및 이해'
  }
  
  let prompt = `다음 논문을 기반으로 ${questionCount}개의 퀴즈를 생성해주세요.

논문 제목: ${paper.paper_title}
논문 초록: ${paper.paper_abstract}

🎯 학습 목적: ${purposeDescription}
📂 선택된 카테고리: ${defaultCategories.map((cat: string) => `${cat} (${categoryDescriptions[cat]})`).join(', ')}
🧩 퀴즈 유형: ${defaultQuestionTypes.map((type: string) => `${type} (${questionTypeDescriptions[type]})`).join(', ')}
난이도: ${difficulty === 'easy' ? '쉬움' : difficulty === 'medium' ? '보통' : '어려움'}

${focusPages && focusPages.length > 0 ? `선택된 페이지: ${focusPages.map((p: number) => p + 1).join(', ')}` : '전체 페이지에서 퀴즈 생성'}

논문 내용:
${contents.map((content, index) => `${content.content_index + 1}. [${content.content_type}] ${content.content_text.substring(0, 500)}...`).join('\n')}

다음 JSON 형식으로 정확히 응답해주세요:

[
  {
    "quiz_type": "multiple_choice|ox_quiz|short_answer|essay|code_understanding",
    "quiz_question": "문제 내용",
    "quiz_choices": ["선택지1", "선택지2", "선택지3", "선택지4"],
    "quiz_answer": "정답",
    "quiz_explanation": "해설",
    "content_index": 0,
    "quiz_category": "카테고리명"
  }
]

주의사항:
- 객관식은 반드시 4개의 선택지를 제공하세요
- OX 퀴즈는 명확한 참/거짓 판단이 가능한 문제로 만들고, quiz_choices는 ["참", "거짓"]으로 설정하세요
- 단답형은 핵심 키워드로 답할 수 있는 문제로 만드세요
- 서술형은 논리적 사고가 필요한 문제로 만드세요
- 코드 이해는 코드 분석이나 알고리즘 이해 문제로 만드세요
- content_index는 해당하는 논문 내용의 인덱스를 사용하세요
- 난이도에 맞게 문제를 조정하세요 (쉬움: 기본 개념, 보통: 응용, 어려움: 심화)
- 정답과 해설은 논문 내용을 정확히 반영하세요
- 선택된 카테고리에 맞는 문제를 생성하세요
- 선택된 퀴즈 유형만 생성하세요 (선택하지 않은 유형은 생성하지 마세요)
- quiz_category 필드에는 선택된 카테고리 중 하나를 지정하세요 (예: "개념 이해", "원리 및 구조" 등)`

  return prompt
}

async function generateQuizzesWithAI(prompt: string, options: any, contents: any[]): Promise<GeneratedQuiz[]> {
  try {
    // OpenAI API 호출
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '당신은 논문 내용을 기반으로 퀴즈를 생성하는 전문가입니다. 주어진 논문 내용을 분석하여 다양한 유형의 퀴즈를 생성해주세요.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    })

    if (!response.ok) {
      console.error('OpenAI API 오류:', response.status, response.statusText)
      throw new Error('AI 퀴즈 생성에 실패했습니다.')
    }

    const data = await response.json()
    const aiResponse = data.choices[0]?.message?.content

    if (!aiResponse) {
      throw new Error('AI 응답을 받지 못했습니다.')
    }

    console.log('AI 응답:', aiResponse)

    // AI 응답을 JSON으로 파싱
    try {
      // JSON 부분만 추출 (```json ... ``` 형태일 수 있음)
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) || 
                       aiResponse.match(/\[[\s\S]*\]/) || 
                       [null, aiResponse]
      
      const jsonString = jsonMatch[1] || jsonMatch[0]
      const quizzes = JSON.parse(jsonString)

      if (!Array.isArray(quizzes)) {
        throw new Error('AI 응답이 배열 형태가 아닙니다.')
      }

      // 응답 검증 및 content_index 매핑
      const validatedQuizzes = quizzes.map((quiz, index) => ({
        quiz_type: quiz.quiz_type || 'multiple_choice',
        quiz_question: quiz.quiz_question || `문제 ${index + 1}`,
        quiz_choices: quiz.quiz_choices || [],
        quiz_answer: quiz.quiz_answer || '',
        quiz_explanation: quiz.quiz_explanation || '',
        content_index: quiz.content_index || (contents[index % contents.length]?.content_index || 0),
        quiz_category: quiz.quiz_category || 'definition' // 카테고리 정보 추가
      }))

      return validatedQuizzes

    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError)
      console.error('AI 응답:', aiResponse)
      throw new Error('AI 응답을 파싱할 수 없습니다.')
    }

  } catch (error) {
    console.error('AI 퀴즈 생성 오류:', error)
    
    // AI API 실패 시 더미 데이터로 대체
    console.log('AI API 실패, 더미 데이터 사용')
    return generateDummyQuizzes(options, contents)
  }
}

// 더미 퀴즈 생성 함수 (AI API 실패 시 사용)
function generateDummyQuizzes(options: any, contents: any[]): GeneratedQuiz[] {
  const dummyQuizzes: GeneratedQuiz[] = []
  
  // 기존 API 호환성을 위한 기본값 설정
  const defaultQuestionTypes = options.questionTypes || ['multiple_choice']
  
  for (let i = 0; i < options.questionCount; i++) {
    const questionType = defaultQuestionTypes[i % defaultQuestionTypes.length]
    const contentIndex = contents[i % contents.length].content_index
    
    // OX 퀴즈의 경우 선택지를 참/거짓으로 설정
    const choices = questionType === 'ox_quiz' ? ['참', '거짓'] : 
                   questionType === 'multiple_choice' ? ['선택지 A', '선택지 B', '선택지 C', '선택지 D'] : []
    
    if (questionType === 'multiple_choice') {
      dummyQuizzes.push({
        quiz_type: 'multiple_choice',
        quiz_question: `이 논문의 주요 연구 목적은 무엇인가요? (${i + 1}번 문제)`,
        quiz_choices: [
          "기존 방법의 성능 향상",
          "새로운 알고리즘 개발",
          "데이터 분석 방법론 제시",
          "실험 결과 검증"
        ],
        quiz_answer: "새로운 알고리즘 개발",
        quiz_explanation: "논문의 초록과 서론에서 새로운 알고리즘을 제안한다고 명시되어 있습니다.",
        content_index: contentIndex,
        quiz_category: "개념 이해"
      })
    } else if (questionType === 'ox_quiz') {
      dummyQuizzes.push({
        quiz_type: 'ox_quiz',
        quiz_question: `이 논문에서 제안한 방법은 기존 방법보다 성능이 우수하다. (${i + 1}번 문제)`,
        quiz_choices: ["참", "거짓"],
        quiz_answer: "참",
        quiz_explanation: "실험 결과에서 제안한 방법이 기존 방법보다 우수한 성능을 보였다고 명시되어 있습니다.",
        content_index: contentIndex,
        quiz_category: "실험 및 결과"
      })
    } else if (questionType === 'short_answer') {
      dummyQuizzes.push({
        quiz_type: 'short_answer',
        quiz_question: `실험에서 사용된 데이터셋의 크기를 간단히 설명하세요. (${i + 1}번 문제)`,
        quiz_answer: "10,000개 샘플",
        quiz_explanation: "실험 섹션에서 총 10,000개의 샘플을 사용했다고 명시되어 있습니다.",
        content_index: contentIndex,
        quiz_category: "방법론/기술"
      })
    } else if (questionType === 'code_understanding') {
      dummyQuizzes.push({
        quiz_type: 'code_understanding',
        quiz_question: `제안된 알고리즘의 시간 복잡도를 분석하세요. (${i + 1}번 문제)`,
        quiz_answer: "O(n log n)",
        quiz_explanation: "알고리즘 분석에서 시간 복잡도가 O(n log n)임을 확인할 수 있습니다.",
        content_index: contentIndex,
        quiz_category: "원리 및 구조"
      })
    } else {
      dummyQuizzes.push({
        quiz_type: 'essay',
        quiz_question: `이 논문의 방법론과 결과에 대해 자세히 설명하세요. (${i + 1}번 문제)`,
        quiz_answer: "이 논문에서는 새로운 알고리즘을 제안하고, 10,000개 샘플로 실험하여 15%의 성능 향상을 달성했습니다.",
        quiz_explanation: "방법론에서는 새로운 알고리즘의 구조를 설명하고, 결과에서는 성능 향상 수치를 제시했습니다.",
        content_index: contentIndex,
        quiz_category: "요약"
      })
    }
  }

  return dummyQuizzes
}

async function saveQuizzesToDatabase(paperId: string, quizzes: GeneratedQuiz[]) {
  const savedQuizzes = []

  for (const quiz of quizzes) {
    // 해당 content_index의 paper_content 찾기
    const { data: content } = await supabase
      .from('paper_contents')
      .select('content_id')
      .eq('content_paper_id', parseInt(paperId))
      .eq('content_index', quiz.content_index)
      .single()

    if (content) {
      const { data: savedQuiz, error } = await supabase
        .from('paper_quizzes')
        .insert({
          quiz_content_id: content.content_id,
          quiz_type: quiz.quiz_type,
          quiz_question: quiz.quiz_question,
          quiz_choices: quiz.quiz_choices || null,
          quiz_answer: quiz.quiz_answer,
          quiz_explanation: quiz.quiz_explanation,
          quiz_category: quiz.quiz_category || '일반 학습' // 카테고리 정보 추가
        })
        .select()
        .single()

      if (!error && savedQuiz) {
        savedQuizzes.push(savedQuiz)
      }
    }
  }

  return savedQuizzes
} 