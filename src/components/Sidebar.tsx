// src/components/Sidebar.tsx
'use client'

import React from 'react'
import LogoutButton from '@/components/ui/LogoutButton'
import { StarIcon as StarOutline } from '@heroicons/react/24/outline'
import { StarIcon as StarSolid } from '@heroicons/react/24/solid'
import { useRouter } from 'next/navigation'
import { useSidebar } from '@/context/SidebarContext'

type SidebarProps = { userName?: string }

export default function Sidebar({ userName }: SidebarProps) {
  const router = useRouter()
  const { recent, favorites, handleTopicClick, toggleFavorite } = useSidebar()

  return (
    <aside className="w-64 bg-white border-r p-6 flex flex-col">
      <div className="mb-8 flex items-center">
        <div className="w-10 h-10 bg-gray-200 rounded-full" />
        <span className="ml-3 font-semibold">{userName || 'Guest'}</span>
      </div>

      <div className="mb-6">
        <h2 className="text-sm font-semibold mb-2">최근 본 목록</h2>
        {recent.length ? (
          <ul className="space-y-1">
            {recent.map(t => (
              <li
                key={t.topic_id}
                onClick={() => { handleTopicClick(t); router.push(`/topics/${t.topic_id}`) }}
                className="text-sm text-blue-600 cursor-pointer hover:underline"
              >
                {t.topic_name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">없음</p>
        )}
      </div>

      <div className="mb-6">
        <h2 className="text-sm font-semibold mb-2">즐겨찾기</h2>
        {favorites.length ? (
          <ul className="space-y-1">
            {favorites.map(t => {
              const isFav = favorites.some(f => f.topic_id === t.topic_id)
              return (
                <li
                  key={t.topic_id}
                  onClick={() => toggleFavorite(t)}
                  className={`flex items-center space-x-1 text-sm cursor-pointer hover:underline px-1 rounded ${
                    isFav ? 'bg-yellow-100' : ''
                  }`}
                >
                  {isFav ? (
                    <StarSolid className="w-4 h-4 text-yellow-500" />
                  ) : (
                    <StarOutline className="w-4 h-4 text-gray-400" />
                  )}
                  <span>{t.topic_name}</span>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">없음</p>
        )}
      </div>

      <div className="mt-auto">
        <LogoutButton />
      </div>
    </aside>
  )
}
