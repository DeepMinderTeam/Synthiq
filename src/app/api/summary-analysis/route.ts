import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/summary-analysis 호출됨')
    
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

    if (!paperId) {
      return NextResponse.json({ error: 'paperId가 필요합니다.' }, { status: 400 })
    }

    // 기존 요약 분석 조회
    const { data: existingAnalysis, error: fetchError } = await supabase
      .from('summary_analyses')
      .select('*')
      .eq('summary_user_id', user.id)
      .eq('summary_paper_id', parseInt(paperId))
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116는 데이터가 없는 경우
      console.error('요약 분석 조회 오류:', fetchError)
      return NextResponse.json({ error: '분석 조회에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      analysis: existingAnalysis || null
    })

  } catch (error) {
    console.error('요약 분석 조회 오류:', error)
    return NextResponse.json(
      { error: '요약 분석 조회에 실패했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류') },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/summary-analysis 호출됨')
    
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
    console.log('요약 분석 요청 바디:', body)
    
    const { wrongQuestions, paperId, totalWrongCount } = body
    console.log('요약 분석 요청:', { totalWrongCount, paperId })
    
    const paperIdNum = parseInt(paperId) || 0

    if (!wrongQuestions || !Array.isArray(wrongQuestions)) {
      return NextResponse.json({ error: '틀린 문제 정보가 필요합니다.' }, { status: 400 })
    }

    // GPT API를 사용하여 간단한 요약 분석 생성
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
            content: `당신은 학습자를 위한 간단하고 명확한 요약 분석 전문가입니다.
            
틀린 문제들을 분석하여 다음과 같은 간단한 요약을 제공해주세요:

1. **핵심 기억 포인트**: 반드시 기억해야 할 핵심 개념들 (3-5개)
2. **주요 실수 패턴**: 자주 하는 실수 유형 (2-3개)
3. **학습 우선순위**: 가장 중요한 학습 영역 (1-2개)

응답 형식:
{
  "keyPoints": ["기억해야 할 핵심 포인트들"],
  "mistakePatterns": ["주요 실수 패턴들"],
  "learningPriority": "가장 중요한 학습 영역",
  "quickTip": "간단한 학습 팁"
}

간결하고 실용적인 조언을 제공해주세요.`
          },
          {
            role: 'user',
            content: `틀린 문제 수: ${totalWrongCount}개

틀린 문제들:
${wrongQuestions.map((q, i) => `
${i + 1}. 문제: ${q.question}
   정답: ${q.answer}
   카테고리: ${q.category || '분류 없음'}
   틀린 횟수: ${q.mistakeCount}회
`).join('\n')}

위 틀린 문제들을 간단히 분석하여 핵심 기억 포인트와 학습 우선순위를 제시해주세요.`
          }
        ],
        temperature: 0.7,
        max_tokens: 800
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
        keyPoints: ['핵심 개념들을 다시 한번 복습해보세요', '틀린 문제들의 패턴을 파악하세요'],
        mistakePatterns: ['개념을 정확히 이해하지 못한 경우가 많습니다'],
        learningPriority: '틀린 문제들이 많은 영역을 우선적으로 학습하세요',
        quickTip: '틀린 문제들을 중심으로 복습하고, 관련 개념을 체계적으로 정리하세요.'
      }
    }

    // 기존 분석이 있는지 확인
    console.log('기존 요약 분석 확인 시작:', { userId: user.id, paperId: paperIdNum })
    const { data: existingAnalysis, error: checkError } = await supabase
      .from('summary_analyses')
      .select('summary_id')
      .eq('summary_user_id', user.id)
      .eq('summary_paper_id', paperIdNum)
      .single()

    console.log('기존 요약 분석 확인 결과:', { existingAnalysis, checkError })

    let savedAnalysis
    let saveError

    if (existingAnalysis) {
      // 기존 분석 업데이트
      console.log('기존 요약 분석 업데이트 시작:', { summaryId: existingAnalysis.summary_id })
      const { data, error } = await supabase
        .from('summary_analyses')
        .update({
          summary_key_points: analysis.keyPoints,
          summary_mistake_patterns: analysis.mistakePatterns,
          summary_learning_priority: analysis.learningPriority,
          summary_quick_tip: analysis.quickTip
        })
        .eq('summary_id', existingAnalysis.summary_id)
        .select()
        .single()
      
      savedAnalysis = data
      saveError = error
      console.log('기존 요약 분석 업데이트 결과:', { data, error })
    } else {
      // 새 분석 생성
      console.log('새 요약 분석 생성 시작:', { userId: user.id, paperId: paperIdNum })
      const { data, error } = await supabase
        .from('summary_analyses')
        .insert({
          summary_user_id: user.id,
          summary_paper_id: paperIdNum,
          summary_key_points: analysis.keyPoints,
          summary_mistake_patterns: analysis.mistakePatterns,
          summary_learning_priority: analysis.learningPriority,
          summary_quick_tip: analysis.quickTip
        })
        .select()
        .single()
      
      savedAnalysis = data
      saveError = error
      console.log('새 요약 분석 생성 결과:', { data, error })
    }

    if (saveError) {
      console.error('요약 분석 저장 오류:', saveError)
      return NextResponse.json({ error: '분석 저장에 실패했습니다.' }, { status: 500 })
    }

    console.log('요약 분석 저장 성공! 저장된 데이터:', savedAnalysis)

    // 실제로 저장되었는지 확인
    const { data: verifyData, error: verifyError } = await supabase
      .from('summary_analyses')
      .select('*')
      .eq('summary_id', savedAnalysis?.summary_id || existingAnalysis?.summary_id)
      .single()

    console.log('저장 확인 결과:', { verifyData, verifyError })

    return NextResponse.json({
      success: true,
      analysis: savedAnalysis
    })

  } catch (error) {
    console.error('요약 분석 오류:', error)
    return NextResponse.json(
      { error: '요약 분석 생성에 실패했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류') },
      { status: 500 }
    )
  }
} 