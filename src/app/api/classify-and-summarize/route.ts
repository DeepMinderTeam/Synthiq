import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import OpenAI from 'openai'

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// 문단을 배치로 나누는 함수
function chunkArray(array: any[], chunkSize: number) {
  const chunks = []
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize))
  }
  return chunks
}

export async function POST(request: NextRequest) {
  try {
    const { paperId } = await request.json()

    if (!paperId) {
      return NextResponse.json(
        { error: 'paperId가 필요합니다.' },
        { status: 400 }
      )
    }

    console.log('논문 정리노트 생성 시작:', paperId)

    // 1. Supabase에서 해당 논문의 모든 문단 가져오기
    const { data: contents, error: contentsError } = await supabase
      .from('paper_contents')
      .select('*')
      .eq('content_paper_id', parseInt(paperId))
      .order('content_index', { ascending: true })

    if (contentsError) {
      console.error('Supabase 문단 조회 오류:', contentsError)
      return NextResponse.json(
        { error: '문단을 가져올 수 없습니다.' },
        { status: 500 }
      )
    }

    if (!contents || contents.length === 0) {
      console.log('Supabase에 문단이 없습니다.')
      return NextResponse.json(
        { error: '정리할 문단이 없습니다.' },
        { status: 400 }
      )
    }

    console.log(`총 ${contents.length}개의 문단을 처리합니다.`)

    // 2. 기존 요약이 있는지 확인하고 삭제
    const { error: deleteSummaryError } = await supabase
      .from('paper_summaries')
      .delete()
      .eq('summary_content_id', contents[0].content_id)

    if (deleteSummaryError) {
      console.error('기존 요약 삭제 오류:', deleteSummaryError)
      return NextResponse.json(
        { error: '기존 요약을 삭제할 수 없습니다.' },
        { status: 500 }
      )
    }

    // 3. 문단을 10개씩 묶어서 순차적으로 요약 생성
    const chunks = chunkArray(contents, 10)
    const summaries = []

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex]
      const startIndex = chunkIndex * 10 + 1
      const endIndex = Math.min((chunkIndex + 1) * 10, contents.length)
      
      console.log(`배치 ${chunkIndex + 1}/${chunks.length} 처리 중 (문단 ${startIndex}-${endIndex})`)
      
      const summaryPrompt = `
다음은 논문의 ${startIndex}번째부터 ${endIndex}번째까지의 문단들입니다. 
이 문단들을 읽고 정리노트 형태로 요약해주세요.

요약 요구사항:
1. 핵심 내용을 간결하게 정리
2. 중요한 개념이나 용어는 명확히 설명
3. 논문의 흐름을 유지하면서 정리
4. "정리노트" 형태로 작성

문단들:
${chunk.map((content: any, idx: number) => `${startIndex + idx}. ${content.content_text}`).join('\n\n')}

정리노트를 작성해주세요:
`

      const summaryResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '당신은 논문을 읽고 정리노트를 작성하는 전문가입니다. 핵심 내용을 간결하고 명확하게 정리해주세요.'
          },
          {
            role: 'user',
            content: summaryPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 800
      })

      const summaryResult = summaryResponse.choices[0]?.message?.content
      if (!summaryResult) {
        throw new Error(`배치 ${chunkIndex + 1}의 OpenAI 요약 응답을 받지 못했습니다.`)
      }

      summaries.push({
        summary_content_id: chunk[0].content_id,
        summary_text: summaryResult,
        summary_type: `AI_정리노트_${startIndex}-${endIndex}`
      })

      console.log(`배치 ${chunkIndex + 1}/${chunks.length} 완료`)
    }

    // 4. 요약을 Supabase에 저장
    if (summaries.length > 0) {
      const { data: insertedSummaries, error: insertSummaryError } = await supabase
        .from('paper_summaries')
        .insert(summaries)
        .select()

      if (insertSummaryError) {
        console.error('요약 저장 오류:', insertSummaryError)
        return NextResponse.json(
          { error: '요약을 저장할 수 없습니다.' },
          { status: 500 }
        )
      }

      console.log(`${insertedSummaries?.length || 0}개의 요약이 성공적으로 저장되었습니다.`)

      return NextResponse.json({
        success: true,
        summaryCount: insertedSummaries?.length || 0,
        message: '정리노트가 성공적으로 생성되었습니다.'
      })
    } else {
      return NextResponse.json({
        success: false,
        summaryCount: 0,
        message: '생성된 요약이 없습니다.'
      })
    }

  } catch (error) {
    console.error('정리노트 생성 중 오류:', error)
    return NextResponse.json(
      { error: '정리노트 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 