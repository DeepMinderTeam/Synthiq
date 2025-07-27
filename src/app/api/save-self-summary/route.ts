import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function POST(request: NextRequest) {
  try {
    const { summaryId, summaryText } = await request.json()

    if (!summaryText) {
      return NextResponse.json(
        { error: 'summaryText가 필요합니다.' },
        { status: 400 }
      )
    }

    let summaryIdToUpdate = summaryId

    // summaryId가 0이면 첫 번째 요약을 찾아서 업데이트
    if (summaryId === 0) {
      const { data: summaries, error: fetchError } = await supabase
        .from('paper_summaries')
        .select('summary_id')
        .order('summary_id', { ascending: true })
        .limit(1)

      if (fetchError || !summaries || summaries.length === 0) {
        return NextResponse.json(
          { error: '저장할 요약을 찾을 수 없습니다.' },
          { status: 404 }
        )
      }

      summaryIdToUpdate = summaries[0].summary_id
    }

    // 사용자 요약 저장
    const { error } = await supabase
      .from('paper_summaries')
      .update({ summary_text_self: summaryText })
      .eq('summary_id', summaryIdToUpdate)

    if (error) {
      console.error('사용자 요약 저장 오류:', error)
      return NextResponse.json(
        { error: '사용자 요약을 저장할 수 없습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: '사용자 요약이 저장되었습니다.' 
    })
  } catch (error) {
    console.error('사용자 요약 저장 중 오류:', error)
    return NextResponse.json({ 
      error: '사용자 요약 저장 중 오류가 발생했습니다.' 
    }, { status: 500 })
  }
} 