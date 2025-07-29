import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { CreateHighlightRequest, UpdateHighlightRequest } from '@/models/paper_highlights'

// 하이라이트 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const paperId = searchParams.get('paperId')
    const contentId = searchParams.get('contentId')
    const pageId = searchParams.get('pageId')

    if (!paperId) {
      return NextResponse.json(
        { error: 'paperId가 필요합니다.' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('paper_highlights')
      .select('*')
      .eq('highlight_paper_id', parseInt(paperId))

    if (contentId) {
      query = query.eq('highlight_content_id', parseInt(contentId))
    }

    if (pageId) {
      query = query.eq('highlight_page_id', pageId)
    }

    const { data, error } = await query.order('highlight_created_at', { ascending: true })

    if (error) {
      console.error('하이라이트 조회 오류:', error)
      return NextResponse.json(
        { error: '하이라이트를 조회할 수 없습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ highlights: data || [] })
  } catch (error) {
    console.error('하이라이트 조회 중 오류:', error)
    return NextResponse.json(
      { error: '하이라이트 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 하이라이트 생성
export async function POST(request: NextRequest) {
  try {
    const body: CreateHighlightRequest = await request.json()
    const { paperId, contentId, pageId, text, color, startOffset, endOffset } = body

    if (!paperId || !text || !color) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // 현재 사용자 정보 가져오기
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const { data, error } = await supabase
      .from('paper_highlights')
      .insert({
        highlight_paper_id: paperId,
        highlight_content_id: contentId,
        highlight_page_id: pageId,
        highlight_text: text,
        highlight_color: color,
        highlight_start_offset: startOffset,
        highlight_end_offset: endOffset,
        highlight_user_id: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('하이라이트 생성 오류:', error)
      return NextResponse.json(
        { error: '하이라이트를 생성할 수 없습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ highlight: data })
  } catch (error) {
    console.error('하이라이트 생성 중 오류:', error)
    return NextResponse.json(
      { error: '하이라이트 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 하이라이트 수정
export async function PUT(request: NextRequest) {
  try {
    const body: UpdateHighlightRequest = await request.json()
    const { highlightId, text, color, startOffset, endOffset } = body

    if (!highlightId) {
      return NextResponse.json(
        { error: 'highlightId가 필요합니다.' },
        { status: 400 }
      )
    }

    // 현재 사용자 정보 가져오기
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    // 업데이트할 필드만 포함
    const updateData: any = {}
    if (text !== undefined) updateData.highlight_text = text
    if (color !== undefined) updateData.highlight_color = color
    if (startOffset !== undefined) updateData.highlight_start_offset = startOffset
    if (endOffset !== undefined) updateData.highlight_end_offset = endOffset

    const { data, error } = await supabase
      .from('paper_highlights')
      .update(updateData)
      .eq('highlight_id', highlightId)
      .eq('highlight_user_id', user.id) // 자신의 하이라이트만 수정 가능
      .select()
      .single()

    if (error) {
      console.error('하이라이트 수정 오류:', error)
      return NextResponse.json(
        { error: '하이라이트를 수정할 수 없습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ highlight: data })
  } catch (error) {
    console.error('하이라이트 수정 중 오류:', error)
    return NextResponse.json(
      { error: '하이라이트 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 하이라이트 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const highlightId = searchParams.get('highlightId')

    if (!highlightId) {
      return NextResponse.json(
        { error: 'highlightId가 필요합니다.' },
        { status: 400 }
      )
    }

    // 현재 사용자 정보 가져오기
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const { error } = await supabase
      .from('paper_highlights')
      .delete()
      .eq('highlight_id', parseInt(highlightId))
      .eq('highlight_user_id', user.id) // 자신의 하이라이트만 삭제 가능

    if (error) {
      console.error('하이라이트 삭제 오류:', error)
      return NextResponse.json(
        { error: '하이라이트를 삭제할 수 없습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('하이라이트 삭제 중 오류:', error)
    return NextResponse.json(
      { error: '하이라이트 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 