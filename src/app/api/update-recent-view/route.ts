import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function POST(request: NextRequest) {
  try {
    const { userId, type, itemId } = await request.json()

    if (!userId || !type || !itemId) {
      return NextResponse.json(
        { error: 'userId, type, itemId가 필요합니다.' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    if (type === 'topic') {
      // 토픽 최근 본 기록 업데이트
      const { error } = await supabase
        .from('topic_recent_views')
        .upsert({
          view_user_id: userId,
          view_topic_id: itemId,
          view_last_viewed_at: now
        }, {
          onConflict: 'view_user_id,view_topic_id'
        })

      if (error) {
        console.error('토픽 최근 본 기록 업데이트 오류:', error)
        return NextResponse.json(
          { error: '토픽 최근 본 기록을 업데이트할 수 없습니다.' },
          { status: 500 }
        )
      }
    } else if (type === 'paper') {
      // 논문 최근 본 기록 업데이트
      const { error } = await supabase
        .from('paper_recent_views')
        .upsert({
          view_user_id: userId,
          view_paper_id: itemId,
          view_last_viewed_at: now
        }, {
          onConflict: 'view_user_id,view_paper_id'
        })

      if (error) {
        console.error('논문 최근 본 기록 업데이트 오류:', error)
        return NextResponse.json(
          { error: '논문 최근 본 기록을 업데이트할 수 없습니다.' },
          { status: 500 }
        )
      }
    } else {
      return NextResponse.json(
        { error: '잘못된 타입입니다. (topic 또는 paper)' },
        { status: 400 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: '최근 본 기록이 업데이트되었습니다.' 
    })
  } catch (error) {
    console.error('최근 본 기록 업데이트 중 오류:', error)
    return NextResponse.json({ 
      error: '최근 본 기록 업데이트 중 오류가 발생했습니다.' 
    }, { status: 500 })
  }
} 