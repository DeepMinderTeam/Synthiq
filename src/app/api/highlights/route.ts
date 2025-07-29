import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { CreateHighlightRequest, UpdateHighlightRequest } from '@/models/paper_highlights'

// 하이라이트 목록 조회
export async function GET(request: NextRequest) {
  try {
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
    
    const body: CreateHighlightRequest = await request.json()
    const { paperId, contentId, pageId, text, color, startOffset, endOffset } = body

    console.log('하이라이트 생성 요청 받음:', { paperId, contentId, pageId, text, color, startOffset, endOffset })

    if (!paperId || !text || !color) {
      console.log('필수 필드 누락:', { paperId, text, color })
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // Authorization 헤더에서 토큰 가져오기
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Authorization 헤더 누락')
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    // 토큰으로 사용자 정보 가져오기
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      console.log('인증 오류:', authError)
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    console.log('사용자 정보:', { userId: user.id, userEmail: user.email })

    const insertData = {
      highlight_paper_id: paperId,
      highlight_content_id: contentId,
      highlight_page_id: pageId,
      highlight_text: text,
      highlight_color: color,
      highlight_start_offset: startOffset,
      highlight_end_offset: endOffset,
      highlight_user_id: user.id
    }

    console.log('Supabase 삽입 데이터:', insertData)

    const { data, error } = await supabase
      .from('paper_highlights')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Supabase 하이라이트 생성 오류:', error)
      return NextResponse.json(
        { error: '하이라이트를 생성할 수 없습니다: ' + error.message },
        { status: 500 }
      )
    }

    console.log('하이라이트 생성 성공:', data)
    return NextResponse.json({ highlight: data })
  } catch (error) {
    console.error('하이라이트 생성 중 오류:', error)
    return NextResponse.json(
      { error: '하이라이트 생성 중 오류가 발생했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류') },
      { status: 500 }
    )
  }
}

// 하이라이트 수정
export async function PUT(request: NextRequest) {
  try {
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
    
    const body: UpdateHighlightRequest = await request.json()
    const { highlightId, text, color, startOffset, endOffset } = body

    if (!highlightId) {
      return NextResponse.json(
        { error: 'highlightId가 필요합니다.' },
        { status: 400 }
      )
    }

    // Authorization 헤더에서 토큰 가져오기
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Authorization 헤더 누락')
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    // 토큰으로 사용자 정보 가져오기
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      console.log('인증 오류:', authError)
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 400 }
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
    
    const { searchParams } = new URL(request.url)
    const highlightId = searchParams.get('highlightId')

    if (!highlightId) {
      return NextResponse.json(
        { error: 'highlightId가 필요합니다.' },
        { status: 400 }
      )
    }

    // Authorization 헤더에서 토큰 가져오기
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Authorization 헤더 누락')
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    // 토큰으로 사용자 정보 가져오기
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      console.log('인증 오류:', authError)
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