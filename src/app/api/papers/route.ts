import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

/**
 * ✅ GET: 특정 topic에 속한 논문 리스트 가져오기
 *    /api/papers?topicId=123
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const topicId = searchParams.get('topicId')

  if (!topicId) {
    return NextResponse.json({ error: 'topicId가 필요합니다.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('paper') // 실제 테이블 이름
    .select('*')
    .eq('paper_topic_id', topicId)
    .order('paper_created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * ✅ POST: 논문 추가하기
 * body: { paper_topic_id, paper_title, paper_abstract }
 */
export async function POST(req: NextRequest) {
  const { paper_topic_id, paper_title, paper_abstract } = await req.json()

  if (!paper_topic_id || !paper_title) {
    return NextResponse.json({ error: '필수 값이 누락되었습니다.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('paper')
    .insert([
      {
        paper_topic_id,
        paper_title,
        paper_abstract,
        paper_created_at: new Date().toISOString()
      }
    ])
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, inserted: data })
}

/**
 * ✅ PUT: 논문 수정하기
 * body: { paper_id, paper_title, paper_abstract }
 */
export async function PUT(req: NextRequest) {
  const { paper_id, paper_title, paper_abstract } = await req.json()

  if (!paper_id) {
    return NextResponse.json({ error: 'paper_id가 필요합니다.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('paper')
    .update({
      paper_title,
      paper_abstract
    })
    .eq('paper_id', paper_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

/**
 * ✅ DELETE: 논문 삭제하기
 *    /api/papers?id=123
 */
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('paper')
    .delete()
    .eq('paper_id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
