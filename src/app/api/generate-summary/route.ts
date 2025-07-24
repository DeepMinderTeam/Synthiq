import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

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

    // 각 문단별로 요약 생성 및 저장 (더미 요약, 마크다운 형식)
    for (let i = 0; i < contents.length; i++) {
      const content = contents[i];
      // 더미 요약을 마크다운 형식으로 생성
      const summary = `### 문단 ${i + 1} 요약\n\n- **원문:** ${content.content_text.slice(0, 50)}...\n- **요약:** 이 문단은 논문의 주요 내용을 간략히 설명합니다.\n`;

      await supabase
        .from('paper_summaries')
        .insert({
          summary_content_id: content.content_id,
          summary_text: summary,
          summary_type: 'AI_문단요약'
        })
    }

    return NextResponse.json({ success: true, message: `${contents.length}개 문단 요약 완료` })
  } catch (error) {
    return NextResponse.json({ error: '문단별 요약 중 오류 발생' }, { status: 500 })
  }
} 