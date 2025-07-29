import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    // Authorization 헤더에서 토큰 확인
    const authHeader = request.headers.get('authorization')
    let user = null
    let authError = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
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
      
      const { data, error } = await supabase.auth.getUser(token)
      user = data.user
      authError = error
    } else {
      // 쿠키로 인증 시도 (fallback)
      console.log('쿠키로 인증 시도')
      const cookieStore = await cookies()
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll()
            },
            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(({ name, value, options }) =>
                  cookieStore.set(name, value, options)
                )
              } catch {
                // The `setAll` method was called from a Server Component.
                // This can be ignored if you have middleware refreshing
                // user sessions.
              }
            },
          },
        }
      )

      const { data, error } = await supabase.auth.getUser()
      user = data.user
      authError = error
    }

    console.log('인증 확인:', { user: user?.id, authError })
    
    if (authError || !user) {
      console.error('인증 실패:', authError)
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { question, answer, explanation, contentId } = await request.json()
    console.log('요청 데이터:', { question: question?.substring(0, 50), answer, contentId })

    if (!question || !answer || !contentId) {
      console.error('필수 정보 누락:', { question: !!question, answer: !!answer, contentId })
      return NextResponse.json({ error: '필수 정보가 누락되었습니다.' }, { status: 400 })
    }

    // 해당 content의 번역된 텍스트 가져오기
    const cookieStore = await cookies()
    const supabaseClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )

    const { data: contentData, error: contentError } = await supabaseClient
      .from('paper_contents')
      .select('content_text_eng')
      .eq('content_id', contentId)
      .single()

    if (contentError || !contentData?.content_text_eng) {
      return NextResponse.json({ error: '논문 내용을 찾을 수 없습니다.' }, { status: 404 })
    }

    const paperContent = contentData.content_text_eng

    // GPT API를 사용해서 정답 근거 찾기
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
                   content: `당신은 논문 내용에서 퀴즈 문제의 정답 근거를 정확히 찾는 전문가입니다.

다음 규칙을 엄격히 따라주세요:

1. **정확성**: 정답과 직접적으로 관련된 구체적인 문장이나 구절만 선택하세요.
2. **완전성**: 선택한 텍스트가 정답을 완전히 뒷받침할 수 있어야 합니다.
3. **길이**: 15-80단어 정도의 적절한 길이로 선택하세요.
4. **위치**: 논문 내용에서 실제로 존재하는 텍스트여야 합니다.
5. **포함**: 정답의 핵심 키워드나 개념이 포함된 문장을 우선적으로 선택하세요.
6. **문맥**: 문맥상 정답과 일치하는 내용이어야 합니다.

응답 형식:
- 근거를 찾은 경우: {"evidence": "찾은 근거 텍스트", "startIndex": 시작위치, "endIndex": 끝위치}
- 근거를 찾지 못한 경우: {"evidence": null, "startIndex": -1, "endIndex": -1}

주의사항:
- 일반적인 설명이나 배경 정보는 피하세요.
- 정답과 직접적으로 관련된 구체적인 내용만 선택하세요.
- 선택한 텍스트가 정답을 명확히 뒷받침하는지 다시 한번 확인하세요.`
                 },
                 {
                   role: 'user',
                   content: `문제: ${question}
정답: ${answer}
해설: ${explanation || '해설 없음'}

논문 내용:
${paperContent}

위 논문 내용에서 정답의 근거가 되는 정확한 텍스트를 찾아주세요. 
정답과 직접적으로 관련된 구체적인 문장이나 구절을 선택하고, 
일반적인 설명이나 배경 정보는 제외해주세요.`
                 }
               ],
                       temperature: 0.0,
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
    let evidenceData
    try {
      evidenceData = JSON.parse(gptContent)
    } catch (parseError) {
      console.log('JSON 파싱 실패, 텍스트에서 추출 시도:', gptContent)
      
      // JSON 파싱 실패 시 텍스트에서 근거 추출 시도
      const evidenceMatch = gptContent.match(/"evidence":\s*"([^"]+)"/)
      const startMatch = gptContent.match(/"startIndex":\s*(\d+)/)
      const endMatch = gptContent.match(/"endIndex":\s*(\d+)/)
      
      if (evidenceMatch) {
        evidenceData = {
          evidence: evidenceMatch[1],
          startIndex: startMatch ? parseInt(startMatch[1]) : -1,
          endIndex: endMatch ? parseInt(endMatch[1]) : -1
        }
        console.log('텍스트에서 근거 추출 성공:', evidenceData.evidence.substring(0, 50))
      } else {
        // 더 정교한 텍스트 추출 시도
        const lines = gptContent.split('\n')
        for (const line of lines) {
          if (line.includes('evidence') && line.includes('"')) {
            const match = line.match(/"([^"]+)"/)
            if (match && match[1].length > 10) {
              evidenceData = {
                evidence: match[1],
                startIndex: -1,
                endIndex: -1
              }
              console.log('라인별 근거 추출 성공:', evidenceData.evidence.substring(0, 50))
              break
            }
          }
        }
        
        if (!evidenceData) {
          console.log('모든 추출 방법 실패')
          throw new Error('근거를 찾을 수 없습니다.')
        }
      }
    }

    // 근거 품질 검증
    if (evidenceData.evidence) {
      const evidence = evidenceData.evidence.trim()
      
      // 너무 짧거나 일반적인 근거는 제외
      if (evidence.length < 15) {
        console.log('근거가 너무 짧음:', evidence)
        return NextResponse.json({
          success: false,
          evidence: null,
          startIndex: -1,
          endIndex: -1,
          reason: '근거가 너무 짧습니다.'
        })
      }
      
      // 일반적인 설명이나 배경 정보인지 확인
      const genericPhrases = [
        '이 연구는', '본 논문은', '이러한', '이런', '이것은', '이것이',
        '연구에서', '논문에서', '결과는', '결과가', '분석은', '분석이'
      ]
      
      const isGeneric = genericPhrases.some(phrase => 
        evidence.toLowerCase().startsWith(phrase.toLowerCase())
      )
      
      if (isGeneric && evidence.length < 50) {
        console.log('일반적인 설명으로 판단됨:', evidence)
        return NextResponse.json({
          success: false,
          evidence: null,
          startIndex: -1,
          endIndex: -1,
          reason: '일반적인 설명입니다.'
        })
      }
    }

    return NextResponse.json({
      success: true,
      evidence: evidenceData.evidence,
      startIndex: evidenceData.startIndex,
      endIndex: evidenceData.endIndex
    })

  } catch (error) {
    console.error('근거 찾기 오류:', error)
    return NextResponse.json(
      { error: '근거 찾기에 실패했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류') },
      { status: 500 }
    )
  }
} 