import { NextRequest, NextResponse } from 'next/server'

interface QuizGradingRequest {
  quizId: number
  userAnswer: string
  correctAnswer: string
  questionType: 'short_answer' | 'essay'
  questionText: string
}

interface GradingResult {
  isCorrect: boolean
  score: number // 0-100 점수
  feedback: string
  explanation: string
}

export async function POST(request: NextRequest) {
  try {
    const { quizId, userAnswer, correctAnswer, questionType, questionText }: QuizGradingRequest = await request.json()

    // AI 채점 로직
    const gradingResult = await gradeWithAI({
      userAnswer,
      correctAnswer,
      questionType,
      questionText
    })

    return NextResponse.json(gradingResult)

  } catch (error) {
    console.error('퀴즈 채점 오류:', error)
    return NextResponse.json({ error: '퀴즈 채점 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

async function gradeWithAI(params: { userAnswer: string; correctAnswer: string; questionType: string; questionText: string }): Promise<GradingResult> {
  const { userAnswer, correctAnswer, questionType, questionText } = params

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
            content: `당신은 교육 전문가입니다. 주어진 문제와 정답, 학생의 답변을 분석하여 정확하고 공정하게 채점해주세요. 
            
            채점 기준:
            - 단답형: 핵심 키워드와 의미가 일치하는지 확인
            - 서술형: 내용의 정확성, 완성도, 논리성을 종합적으로 평가
            
            응답 형식:
            {
              "isCorrect": boolean,
              "score": number (0-100),
              "feedback": "간단한 피드백",
              "explanation": "상세한 해설"
            }`
          },
          {
            role: 'user',
            content: `문제: ${questionText}
            정답: ${correctAnswer}
            학생 답변: ${userAnswer}
            문제 유형: ${questionType === 'short_answer' ? '단답형' : '서술형'}
            
            위 정보를 바탕으로 채점해주세요.`
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    })

    if (!response.ok) {
      console.error('OpenAI API 오류:', response.status, response.statusText)
      throw new Error('AI 채점에 실패했습니다.')
    }

    const data = await response.json()
    const aiResponse = data.choices[0]?.message?.content

    if (!aiResponse) {
      throw new Error('AI 응답을 받지 못했습니다.')
    }

    console.log('AI 채점 응답:', aiResponse)

    // AI 응답을 JSON으로 파싱
    try {
      // JSON 부분만 추출
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) || 
                       aiResponse.match(/\{[\s\S]*\}/) || 
                       [null, aiResponse]
      
      const jsonString = jsonMatch[1] || jsonMatch[0]
      const result = JSON.parse(jsonString)

      return {
        isCorrect: result.isCorrect || false,
        score: Math.min(100, Math.max(0, result.score || 0)),
        feedback: result.feedback || '채점 완료',
        explanation: result.explanation || '상세한 해설을 제공할 수 없습니다.'
      }

    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError)
      console.error('AI 응답:', aiResponse)
      throw new Error('AI 응답을 파싱할 수 없습니다.')
    }

  } catch (error) {
    console.error('AI 채점 오류:', error)
    
    // AI API 실패 시 기본 채점 로직 사용
    return fallbackGrading(userAnswer, correctAnswer, questionType)
  }
}

// 기본 채점 로직 (AI API 실패 시 사용)
function fallbackGrading(userAnswer: string, correctAnswer: string, questionType: string): GradingResult {
  const userAnswerLower = userAnswer.toLowerCase().trim()
  const correctAnswerLower = correctAnswer.toLowerCase().trim()

  if (questionType === 'short_answer') {
    // 단답형: 키워드 매칭
    const userKeywords = userAnswerLower.split(/\s+/)
    const correctKeywords = correctAnswerLower.split(/\s+/)
    const matchingKeywords = userKeywords.filter(keyword => 
      correctKeywords.some(correct => correct.includes(keyword) || keyword.includes(correct))
    )
    
    const accuracy = matchingKeywords.length / Math.max(userKeywords.length, correctKeywords.length)
    const isCorrect = accuracy > 0.5

    return {
      isCorrect,
      score: Math.round(accuracy * 100),
      feedback: isCorrect ? '정답입니다!' : '틀렸습니다.',
      explanation: `정답: ${correctAnswer}`
    }
  } else {
    // 서술형: 길이와 키워드 기반
    const lengthScore = Math.min(100, (userAnswer.length / 50) * 100)
    const keywordScore = userAnswerLower.includes(correctAnswerLower) ? 50 : 0
    const totalScore = Math.round((lengthScore + keywordScore) / 2)
    const isCorrect = totalScore > 60

    return {
      isCorrect,
      score: totalScore,
      feedback: isCorrect ? '좋은 답변입니다!' : '더 자세히 작성해보세요.',
      explanation: `정답: ${correctAnswer}`
    }
  }
} 