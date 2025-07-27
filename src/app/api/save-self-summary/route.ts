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
        // 요약이 없으면 새로 생성
        const { data: newSummary, error: createError } = await supabase
          .from('paper_summaries')
          .insert({
            summary_content_id: 1, // 기본값
            summary_text: '', // 빈 AI 요약
            summary_text_self: summaryText // 사용자 요약
          })
          .select()
          .single()

        if (createError) {
          console.error('새 요약 생성 오류:', createError)
        return NextResponse.json(
            { error: '새 요약을 생성할 수 없습니다.' },
            { status: 500 }
        )
        }

        return NextResponse.json({ 
          success: true, 
          message: '사용자 요약이 저장되었습니다.',
          summaryId: newSummary.summary_id
        })
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
      message: '사용자 요약이 저장되었습니다.',
      summaryId: summaryIdToUpdate
    })
  } catch (error) {
    console.error('사용자 요약 저장 중 오류:', error)
    return NextResponse.json({ 
      error: '사용자 요약 저장 중 오류가 발생했습니다.' 
    }, { status: 500 })
  }
} 