import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const paperId = searchParams.get('paperId')

    let query = supabase
      .from('wrong_answer_notes')
      .select(`
        *,
        test_attempt_items!inner(
          attempt_item_user_answer,
          attempt_item_is_correct,
          attempt_item_evidence,
          attempt_item_evidence_content_id,
          attempt_item_evidence_start_index,
          attempt_item_evidence_end_index,
          paper_test_items!inner(
            paper_quizzes!inner(
              quiz_question,
              quiz_answer,
              quiz_explanation,
              quiz_type,
              quiz_category,
              paper_contents!inner(content_paper_id)
            )
          )
        )
      `)
      .eq('note_user_id', user.id)

    if (paperId) {
      query = query.eq('paper_contents.content_paper_id', paperId)
    }

    const { data, error } = await query.order('note_last_wrong_date', { ascending: false })

    if (error) {
      console.error('오답노트 조회 오류:', error)
      return NextResponse.json({ error: '오답노트를 불러오는 중 오류가 발생했습니다.' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('오답노트 조회 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/wrong-answer-notes 호출됨')
    
    // Authorization 헤더에서 토큰 확인
    const authHeader = request.headers.get('authorization')
    console.log('Authorization 헤더:', authHeader ? '있음' : '없음')
    
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
      console.log('쿠키 개수:', cookieStore.getAll().length)
      
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

    const body = await request.json()
    const { attemptItemId } = body

    // Supabase 클라이언트 생성 (쿠키 기반)
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

    // 기존 오답노트가 있는지 확인
    const { data: existingNote } = await supabase
      .from('wrong_answer_notes')
      .select('*')
      .eq('note_user_id', user.id)
      .eq('note_attempt_item_id', attemptItemId)
      .single()

    if (existingNote) {
      // 기존 노트 업데이트 (틀린 횟수 증가)
      const { data, error } = await supabase
        .from('wrong_answer_notes')
        .update({
          note_mistake_count: existingNote.note_mistake_count + 1,
          note_last_wrong_date: new Date().toISOString(),
          note_updated_at: new Date().toISOString()
        })
        .eq('note_id', existingNote.note_id)
        .select()
        .single()

      if (error) {
        console.error('오답노트 업데이트 오류:', error)
        return NextResponse.json({ error: '오답노트 업데이트 중 오류가 발생했습니다.' }, { status: 500 })
      }

      return NextResponse.json(data)
    } else {
      // 새 오답노트 생성
      const { data, error } = await supabase
        .from('wrong_answer_notes')
        .insert({
          note_user_id: user.id,
          note_attempt_item_id: attemptItemId
        })
        .select()
        .single()

      if (error) {
        console.error('오답노트 생성 오류:', error)
        return NextResponse.json({ error: '오답노트 생성 중 오류가 발생했습니다.' }, { status: 500 })
      }

      return NextResponse.json(data)
    }
  } catch (error) {
    console.error('오답노트 생성 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
} 