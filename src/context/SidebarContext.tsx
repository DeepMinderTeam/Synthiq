// src/context/SidebarContext.tsx
'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Topic } from '@/models/topics'

// 로우 타입 정의
type TopicView = { topics: Topic[] }

// Context에 담길 값의 타입
type SidebarContextType = {
  recent: Topic[]
  favorites: Topic[]
  handleTopicClick: (t: Topic) => void
  toggleFavorite: (t: Topic) => void
}

// Context 생성
const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

// Provider 컴포넌트
export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [recent, setRecent] = useState<Topic[]>([])
  const [favorites, setFavorites] = useState<Topic[]>([])

  // 서버에서 데이터 로드
  const loadLists = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [rvRes, fvRes] = await Promise.all([
      supabase
        .from('topic_recent_views')
        .select('topics(*)')
        .eq('view_user_id', user.id)
        .order('view_last_viewed_at', { ascending: false })
        .limit(5)
        .returns<TopicView[]>(),
      supabase
        .from('topic_favorites')
        .select('topics(*)')
        .eq('fav_user_id', user.id)
        .order('fav_created_at', { ascending: false })
        .limit(5)
        .returns<TopicView[]>(),
    ])

    if (!rvRes.error && rvRes.data) setRecent(rvRes.data.flatMap(r => r.topics))
    if (!fvRes.error && fvRes.data) setFavorites(fvRes.data.flatMap(f => f.topics))
  }

  useEffect(() => {
    void loadLists()

    const channel = supabase.channel('favorites-context')
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'topic_favorites' }, () => {
        void loadLists()
        window.location.reload()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'topic_recent_views' }, () => {
        void loadLists()
        window.location.reload()
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [])

  const handleTopicClick = async (t: Topic) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('topic_recent_views').upsert({ view_user_id: user.id, topic_id: t.topic_id, view_last_viewed_at: new Date().toISOString() })
    setRecent(prev => [t, ...prev.filter(x => x.topic_id !== t.topic_id)].slice(0, 5))
  }

  const toggleFavorite = async (t: Topic) => {
    const isFav = favorites.some(f => f.topic_id === t.topic_id)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (isFav) {
      await supabase.from('topic_favorites').delete().match({ fav_user_id: user.id, topic_id: t.topic_id })
    } else {
      await supabase.from('topic_favorites').insert({ fav_user_id: user.id, topic_id: t.topic_id })
    }
  }

  return (
    <SidebarContext.Provider value={{ recent, favorites, handleTopicClick, toggleFavorite }}>
      {children}
    </SidebarContext.Provider>
  )
}

export const useSidebar = (): SidebarContextType => {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider')
  return ctx
}
