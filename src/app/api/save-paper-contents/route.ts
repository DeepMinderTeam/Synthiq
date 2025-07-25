import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function POST(request: NextRequest) {
  try {
    const { paperId, contents } = await request.json()

    if (!paperId || !contents || !Array.isArray(contents)) {
      return NextResponse.json(
        { error: 'paperId와 contents 배열이 필요합니다.' },
        { status: 400 }
      )
    }

    // 기존 데이터가 있는지 확인
    const { data: existingContents } = await supabase
      .from('paper_contents')
      .select('content_id')
      .eq('content_paper_id', paperId)

    if (existingContents && existingContents.length > 0) {
      // 기존 데이터가 있으면 삭제
      const { error: deleteError } = await supabase
        .from('paper_contents')
        .delete()
        .eq('content_paper_id', paperId)

      if (deleteError) {
        console.error('기존 내용 삭제 오류:', deleteError)
        return NextResponse.json(
          { error: '기존 내용을 삭제할 수 없습니다.' },
          { status: 500 }
        )
      }
    }

    // 새로운 paper_contents 삽입
    const contentsToInsert = contents.map((content: any) => ({
      content_paper_id: parseInt(paperId),
      content_type: '본문',
      content_index: content.content_index,
      content_text: content.content_text
    }))

    const { data: insertedContents, error: insertError } = await supabase
      .from('paper_contents')
      .insert(contentsToInsert)
      .select()

    if (insertError) {
      console.error('내용 삽입 오류:', insertError)
      return NextResponse.json(
        { error: `텍스트 내용을 저장할 수 없습니다: ${insertError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `${contents.length}개의 문단이 저장되었습니다.`,
      contents: insertedContents
    })

  } catch (error) {
    console.error('문단 저장 오류:', error)
    return NextResponse.json(
      { error: '문단 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 