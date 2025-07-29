import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/learning-analysis 호출됨')
    
    // Authorization 헤더에서 토큰 확인
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Authorization 헤더 없음')
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    console.log('토큰으로 인증 시도')
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return []
          },
          setAll() {
            // 서버 컴포넌트에서는 무시
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    console.log('인증 확인:', { user: user?.id, authError })
    
    if (authError || !user) {
      console.error('인증 실패:', authError)
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const paperId = searchParams.get('paperId')
    console.log('paperId:', paperId)

    if (!paperId) {
      return NextResponse.json({ error: 'paperId가 필요합니다.' }, { status: 400 })
    }

    // 기존 학습 분석 조회
    const { data: existingAnalysis, error: fetchError } = await supabase
      .from('learning_analyses')
      .select('*')
      .eq('analysis_user_id', user.id)
      .eq('analysis_paper_id', parseInt(paperId))
      .single()

    console.log('조회 결과:', { existingAnalysis, fetchError })

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116는 데이터가 없는 경우
      console.error('학습 분석 조회 오류:', fetchError)
      return NextResponse.json({ error: '분석 조회에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      analysis: existingAnalysis || null
    })

  } catch (error) {
    console.error('학습 분석 조회 오류:', error)
    return NextResponse.json(
      { error: '학습 분석 조회에 실패했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류') },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/learning-analysis 호출됨')
    
    // Authorization 헤더에서 토큰 확인
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Authorization 헤더 없음')
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    console.log('토큰으로 인증 시도')
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return []
          },
          setAll() {
            // 서버 컴포넌트에서는 무시
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    console.log('인증 확인:', { user: user?.id, authError })
    
    if (authError || !user) {
      console.error('인증 실패:', authError)
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json()
    console.log('학습 분석 요청 바디:', body)
    
    const { wrongQuestions, paperTitle, totalWrongCount } = body
    console.log('학습 분석 요청:', { totalWrongCount, paperTitle })
    
    // paperTitle이 실제로는 paperId
    const paperId = parseInt(paperTitle) || 0

    if (!wrongQuestions || !Array.isArray(wrongQuestions)) {
      return NextResponse.json({ error: '틀린 문제 정보가 필요합니다.' }, { status: 400 })
    }

    // GPT API를 사용하여 학습 분석 생성
    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: `당신은 학습자를 위한 개인화된 학습 분석 전문가입니다. 
            
틀린 문제들을 분석하여 다음과 같은 내용을 제공해주세요:

1. **학습 패턴 분석**: 어떤 유형의 문제를 자주 틀리는지
2. **개선점 식별**: 구체적으로 어떤 부분을 더 공부해야 하는지
3. **학습 전략 제안**: 효과적인 학습 방법과 접근법
4. **중요 개념 강조**: 반드시 기억해야 할 핵심 개념들
5. **실수 원인 분석**: 왜 이런 실수를 하는지

응답 형식:
{
  "summary": "전체적인 학습 상황 요약",
  "weakAreas": ["약점 영역들"],
  "keyConcepts": ["기억해야 할 핵심 개념들"],
  "studyRecommendations": ["학습 권장사항들"],
  "commonMistakes": ["자주 하는 실수들"],
  "improvementPlan": "구체적인 개선 계획",
  "motivationMessage": "학습자를 격려하는 메시지"
}

친근하고 격려적인 톤으로 작성하되, 구체적이고 실용적인 조언을 제공해주세요.`
          },
          {
            role: 'user',
            content: `논문 제목: ${paperTitle}
틀린 문제 수: ${totalWrongCount}개

틀린 문제들:
${wrongQuestions.map((q, i) => `
${i + 1}. 문제: ${q.question}
   정답: ${q.answer}
   설명: ${q.explanation || '설명 없음'}
   카테고리: ${q.category || '분류 없음'}
   틀린 횟수: ${q.mistakeCount}회
   근거: ${q.evidence || '근거 없음'}
`).join('\n')}

위 틀린 문제들을 분석하여 개인화된 학습 가이드를 제공해주세요.`
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    })

    if (!gptResponse.ok) {
      throw new Error('GPT API 호출 실패')
    }

    const gptData = await gptResponse.json()
    const gptContent = gptData.choices[0]?.message?.content

    if (!gptContent) {
      throw new Error('GPT 응답이 비어있습니다.')
    }

    // JSON 파싱
    let analysis
    try {
      analysis = JSON.parse(gptContent)
    } catch (parseError) {
      console.log('JSON 파싱 실패, 기본 분석 생성:', gptContent)
      
      // JSON 파싱 실패 시 기본 분석 생성
      analysis = {
        summary: `총 ${totalWrongCount}개의 문제를 틀렸습니다. 꾸준한 학습으로 개선할 수 있습니다.`,
        weakAreas: ['개념 이해', '문제 해결 능력'],
        keyConcepts: ['핵심 개념들을 다시 한번 복습해보세요'],
        studyRecommendations: ['틀린 문제들을 다시 풀어보고, 관련 개념을 깊이 있게 공부하세요'],
        commonMistakes: ['개념을 정확히 이해하지 못한 경우가 많습니다'],
        improvementPlan: '틀린 문제들을 중심으로 복습하고, 관련 개념을 체계적으로 정리하세요.',
        motivationMessage: '틀린 문제는 더 나은 학습을 위한 기회입니다. 포기하지 말고 꾸준히 노력하세요!'
      }
    }

    // 기존 분석이 있는지 확인
    console.log('기존 분석 확인 시작:', { userId: user.id, paperId })
    const { data: existingAnalysis, error: checkError } = await supabase
      .from('learning_analyses')
      .select('analysis_id')
      .eq('analysis_user_id', user.id)
      .eq('analysis_paper_id', paperId)
      .single()

    console.log('기존 분석 확인 결과:', { existingAnalysis, checkError })

    let savedAnalysis
    let saveError

    if (existingAnalysis) {
      // 기존 분석 업데이트
      console.log('기존 분석 업데이트 시작:', { analysisId: existingAnalysis.analysis_id })
      const { data, error } = await supabase
        .from('learning_analyses')
        .update({
          analysis_summary: analysis.summary,
          analysis_weak_areas: analysis.weakAreas,
          analysis_key_concepts: analysis.keyConcepts,
          analysis_study_recommendations: analysis.studyRecommendations,
          analysis_common_mistakes: analysis.commonMistakes,
          analysis_improvement_plan: analysis.improvementPlan,
          analysis_motivation_message: analysis.motivationMessage
        })
        .eq('analysis_id', existingAnalysis.analysis_id)
        .select()
        .single()
      
      savedAnalysis = data
      saveError = error
      console.log('기존 분석 업데이트 결과:', { data, error })
    } else {
      // 새 분석 생성
      console.log('새 분석 생성 시작:', { userId: user.id, paperId })
      const { data, error } = await supabase
        .from('learning_analyses')
        .insert({
          analysis_user_id: user.id,
          analysis_paper_id: paperId,
          analysis_summary: analysis.summary,
          analysis_weak_areas: analysis.weakAreas,
          analysis_key_concepts: analysis.keyConcepts,
          analysis_study_recommendations: analysis.studyRecommendations,
          analysis_common_mistakes: analysis.commonMistakes,
          analysis_improvement_plan: analysis.improvementPlan,
          analysis_motivation_message: analysis.motivationMessage
        })
        .select()
        .single()
      
      savedAnalysis = data
      saveError = error
      console.log('새 분석 생성 결과:', { data, error })
    }

    if (saveError) {
      console.error('학습 분석 저장 오류:', saveError)
      return NextResponse.json({ error: '분석 저장에 실패했습니다.' }, { status: 500 })
    }

    console.log('학습 분석 저장 성공! 저장된 데이터:', savedAnalysis)

    // 실제로 저장되었는지 확인
    const { data: verifyData, error: verifyError } = await supabase
      .from('learning_analyses')
      .select('*')
      .eq('analysis_id', savedAnalysis?.analysis_id || existingAnalysis?.analysis_id)
      .single()

    console.log('저장 확인 결과:', { verifyData, verifyError })

    return NextResponse.json({
      success: true,
      analysis: savedAnalysis
    })

  } catch (error) {
    console.error('학습 분석 오류:', error)
    return NextResponse.json(
      { error: '학습 분석 생성에 실패했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류') },
      { status: 500 }
    )
  }
} 