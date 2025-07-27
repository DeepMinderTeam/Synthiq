// src/components/Sidebar.tsx
'use client'

import React, { useEffect, useState } from 'react'
import LogoutButton from '@/components/ui/LogoutButton'
import { StarIcon as StarOutline } from '@heroicons/react/24/outline'
import { StarIcon as StarSolid } from '@heroicons/react/24/solid'
import { BookOpen, FileText, Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSidebar } from '@/context/SidebarContext'
import { supabase } from '@/lib/supabaseClient'

type SidebarProps = { userName?: string; userEmail?: string }

interface Topic {
  topic_id: number
  topic_name: string
  topic_description?: string
  topic_created_at: string
}

interface Paper {
  paper_id: number
  paper_title: string
  paper_abstract?: string
  paper_created_at: string
  paper_topic_id: number
}

export default function Sidebar({ userName, userEmail }: SidebarProps) {
  const router = useRouter()
  const { recent, favorites, handleTopicClick, toggleFavorite } = useSidebar()
  const [favoriteTopics, setFavoriteTopics] = useState<Topic[]>([])
  const [favoritePapers, setFavoritePapers] = useState<Paper[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFavorites()
  }, [])

  const fetchFavorites = async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return

    // 즐겨찾기된 토픽 가져오기
    const { data: topicFavs, error: topicErr } = await supabase
      .from('topic_favorites')
      .select(`
        fav_topic_id,
        topics (
          topic_id,
          topic_name,
          topic_description,
          topic_created_at
        )
      `)
      .eq('fav_user_id', user.id)

    if (!topicErr && topicFavs) {
      setFavoriteTopics(topicFavs.map(fav => fav.topics as unknown as Topic))
    }

    // 즐겨찾기된 논문 가져오기
    const { data: paperFavs, error: paperErr } = await supabase
      .from('paper_favorites')
      .select(`
        fav_paper_id,
        paper (
          paper_id,
          paper_title,
          paper_abstract,
          paper_created_at,
          paper_topic_id
        )
      `)
      .eq('fav_user_id', user.id)

    if (!paperErr && paperFavs) {
      setFavoritePapers(paperFavs.map(fav => fav.paper as unknown as Paper))
    }

    setLoading(false)
  }

  const toggleTopicFavorite = async (topicId: number) => {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return

    const exists = favoriteTopics.some(t => t.topic_id === topicId)
    if (exists) {
      await supabase
        .from('topic_favorites')
        .delete()
        .eq('fav_user_id', user.id)
        .eq('fav_topic_id', topicId)
    } else {
      await supabase.from('topic_favorites').insert({
        fav_user_id: user.id,
        fav_topic_id: topicId,
        fav_created_at: new Date().toISOString(),
      })
    }
    fetchFavorites()
  }

  const togglePaperFavorite = async (paperId: number) => {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return

    const exists = favoritePapers.some(p => p.paper_id === paperId)
    if (exists) {
      await supabase
        .from('paper_favorites')
        .delete()
        .eq('fav_user_id', user.id)
        .eq('fav_paper_id', paperId)
    } else {
      await supabase.from('paper_favorites').insert({
        fav_user_id: user.id,
        fav_paper_id: paperId,
        fav_created_at: new Date().toISOString(),
      })
    }
    fetchFavorites()
  }

  return (
    <aside className="w-64 bg-gradient-to-b from-gray-50 to-white border-r border-gray-200 flex flex-col h-screen overflow-hidden">
      {/* 사용자 정보 */}
      <div className="p-6 pb-4">
        <div className="flex items-center p-3 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">
              {userName ? userName.charAt(0).toUpperCase() : 'G'}
            </span>
          </div>
          <div className="ml-3">
            <p className="font-semibold text-gray-900 text-sm">{userName || 'Guest'}</p>
            <p className="text-xs text-gray-500">{userEmail || 'guest@example.com'}</p>
          </div>
        </div>
      </div>

      {/* 고정된 컨텐츠 영역 */}
      <div className="flex-1 px-6">
        {/* 최근 본 목록 */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-3">
            <Calendar className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-gray-700">최근 본 목록</h2>
          </div>
          {recent.length ? (
            <ul className="space-y-2">
              {recent.slice(0, 5).map(t => (
                <li
                  key={t.topic_id}
                  onClick={() => { handleTopicClick(t); router.push(`/topics/${t.topic_id}`) }}
                  className="text-sm text-gray-700 cursor-pointer hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition-all duration-200 flex items-center space-x-2"
                >
                  <BookOpen className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <span className="truncate flex-1 min-w-0">{t.topic_name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 px-2">없음</p>
          )}
        </div>

        {/* 토픽 즐겨찾기 */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-3">
            <StarSolid className="w-4 h-4 text-yellow-500" />
            <h2 className="text-sm font-semibold text-gray-700">토픽 즐겨찾기</h2>
          </div>
          {loading ? (
            <p className="text-sm text-gray-500 px-2">로딩 중...</p>
          ) : favoriteTopics.length ? (
            <ul className="space-y-2">
              {favoriteTopics.slice(0, 5).map(topic => (
                <li
                  key={topic.topic_id}
                  className="text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition-all duration-200 flex items-center space-x-2 group"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleTopicFavorite(topic.topic_id)
                    }}
                    className="flex-shrink-0 hover:scale-110 transition-transform"
                  >
                    <StarSolid className="w-3 h-3 text-yellow-500" />
                  </button>
                  <span 
                    className="truncate flex-1 min-w-0 cursor-pointer"
                    onClick={() => router.push(`/topics/${topic.topic_id}`)}
                  >
                    {topic.topic_name}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 px-2">없음</p>
          )}
        </div>

        {/* 논문 즐겨찾기 */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-3">
            <StarSolid className="w-4 h-4 text-purple-500" />
            <h2 className="text-sm font-semibold text-gray-700">논문 즐겨찾기</h2>
          </div>
          {loading ? (
            <p className="text-sm text-gray-500 px-2">로딩 중...</p>
          ) : favoritePapers.length ? (
            <ul className="space-y-2">
              {favoritePapers.slice(0, 5).map(paper => (
                <li
                  key={paper.paper_id}
                  className="text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition-all duration-200 flex items-center space-x-2 group"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      togglePaperFavorite(paper.paper_id)
                    }}
                    className="flex-shrink-0 hover:scale-110 transition-transform"
                  >
                    <StarSolid className="w-3 h-3 text-purple-500" />
                  </button>
                  <span 
                    className="truncate flex-1 min-w-0 cursor-pointer"
                    onClick={() => router.push(`/topics/${paper.paper_topic_id}/${paper.paper_id}`)}
                  >
                    {paper.paper_title}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 px-2">없음</p>
          )}
        </div>
      </div>

      {/* 로그아웃 버튼 */}
      <div className="flex-shrink-0 p-6 pt-4 border-t border-gray-200 mt-auto">
        <LogoutButton />
      </div>
    </aside>
  )
}
