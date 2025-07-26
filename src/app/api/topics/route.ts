import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

// ✅ GET: topics 테이블 전체 조회
export async function GET() {
  const { data, error } = await supabase
    .from('topics')
    .select('*')
    .order('topic_created_at', { ascending: false }) // 최신순 정렬
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

// ✅ POST: 새로운 topic 추가
export async function POST(req: NextRequest) {
  const { topic_user_id, topic_name, topic_description, topic_created_at } = await req.json()

  const { data, error } = await supabase
    .from('topics')
    .insert([
      {
        topic_user_id,
        topic_name,
        topic_description,
        topic_created_at,
      },
    ])
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, inserted: data })
}

// ✅ PUT: topic 수정 (id 기준으로 topic_name / topic_description 수정)
export async function PUT(req: NextRequest) {
  const { topic_id, topic_name, topic_description } = await req.json()

  const { error } = await supabase
    .from('topics')
    .update({
      topic_name,
      topic_description,
    })
    .eq('topic_id', topic_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}

// ✅ DELETE: topic 삭제 (id 기준)
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  const { error } = await supabase
    .from('topics')
    .delete()
    .eq('topic_id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
