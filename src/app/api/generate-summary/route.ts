import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import OpenAI from 'openai'

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { paperId } = await request.json()

    if (!paperId) {
      return NextResponse.json(
        { error: 'paperId가 필요합니다.' },
        { status: 400 }
      )
    }

    // 논문의 모든 문단 가져오기
    const { data: contents, error: fetchError } = await supabase
      .from('paper_contents')
      .select('content_id, content_text')
      .eq('content_paper_id', parseInt(paperId))
      .order('content_index', { ascending: true })

    if (fetchError) {
      return NextResponse.json({ error: '문단을 가져올 수 없습니다.' }, { status: 500 })
    }

    if (!contents || contents.length === 0) {
      return NextResponse.json({ error: '문단이 없습니다.' }, { status: 400 })
    }

    // 기존 요약 삭제
    await supabase
      .from('paper_summaries')
      .delete()
      .in('summary_content_id', contents.map(c => c.content_id))

    // 각 문단별로 OpenAI를 사용한 요약 생성
    for (let i = 0; i < contents.length; i++) {
      const content = contents[i];
      
      try {
        // OpenAI API 호출
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "당신은 학술 논문의 문단을 요약하는 전문가입니다. 주어진 문단을 간결하고 명확하게 요약해주세요. 마크다운 형식으로 응답해주세요."
            },
            {
              role: "user",
              content: `다음 문단을 요약해주세요:\n\n${content.content_text}`
            }
          ],
          max_tokens: 300,
          temperature: 0.3,
        })

        const summary = completion.choices[0]?.message?.content || '요약을 생성할 수 없습니다.'

        // 요약을 데이터베이스에 저장
        await supabase
          .from('paper_summaries')
          .insert({
            summary_content_id: content.content_id,
            summary_text: summary,
            summary_type: 'AI_문단요약'
          })

      } catch (openaiError) {
        console.error(`문단 ${i + 1} 요약 생성 오류:`, openaiError)
        
        // OpenAI API 오류 시 기본 요약 생성
        const fallbackSummary = `### 문단 ${i + 1} 요약\n\n- **원문:** ${content.content_text.slice(0, 100)}...\n- **요약:** 이 문단은 논문의 주요 내용을 포함하고 있습니다.`

        await supabase
          .from('paper_summaries')
          .insert({
            summary_content_id: content.content_id,
            summary_text: fallbackSummary,
            summary_type: 'AI_문단요약'
          })
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `${contents.length}개 문단 요약 완료` 
    })
  } catch (error) {
    console.error('요약 생성 오류:', error)
    return NextResponse.json({ 
      error: '문단별 요약 중 오류 발생' 
    }, { status: 500 })
  }
} 