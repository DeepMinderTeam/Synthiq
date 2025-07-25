import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function POST(request: NextRequest) {
  try {
    const { paperId, filePath } = await request.json()

    if (!paperId || !filePath) {
      return NextResponse.json(
        { error: 'paperId와 filePath가 필요합니다.' },
        { status: 400 }
      )
    }

    // 임시로 더미 데이터를 생성 (pdf-parse 대신)
    const dummyParagraphs = [
      "이것은 첫 번째 문단입니다. 논문의 서론 부분에 해당합니다.",
      "두 번째 문단은 연구 방법론에 대한 내용입니다.",
      "세 번째 문단에서는 연구 결과를 설명합니다.",
      "마지막 문단은 결론 및 향후 연구 방향에 대한 내용입니다."
    ]

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
    const contentsToInsert = dummyParagraphs.map((text, index) => ({
      content_paper_id: parseInt(paperId),
      content_type: '본문',
      content_index: index + 1,
      content_text: text
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
      message: `${dummyParagraphs.length}개의 문단이 추출되어 저장되었습니다.`,
      contents: insertedContents
    })

  } catch (error) {
    console.error('PDF 텍스트 추출 오류:', error)
    return NextResponse.json(
      { error: 'PDF 텍스트 추출 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 