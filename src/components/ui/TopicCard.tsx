'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Settings as CogIcon } from 'lucide-react'

interface TopicCardProps {
  title: string
  description?: string
  date: string
  thumbnailUrl?: string
  onEdit: () => void
  onDelete: () => void
}

export default function TopicCard({
  title,
  description = '',
  date,
  thumbnailUrl = '/placeholder.png',
  onEdit,
  onDelete,
}: TopicCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 메뉴 바깥 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen])

  return (
    <div className="bg-white rounded-lg shadow-md overflow-visible relative flex flex-col h-60">
      {/* 상단: 요약 + 썸네일 */}
      <div className="flex-1 p-4 flex">
        <p className="flex-1 text-sm text-gray-600 overflow-hidden line-clamp-4">
          {description || '요약이 없습니다.'}
        </p>
        <img
          src={thumbnailUrl}
          alt="썸네일"
          className="w-24 h-24 object-cover rounded ml-4 flex-shrink-0"
        />
      </div>

      {/* 하단: 제목·날짜·메뉴 */}
      <div className="px-4 py-2 border-t flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{date}</p>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-1 hover:bg-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="토픽 설정 메뉴 열기"
          >
            <CogIcon className="w-5 h-5 text-gray-500" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-32 bg-white border rounded shadow-lg z-10">
              <button
                onClick={() => {
                  onEdit()
                  setMenuOpen(false)
                }}
                className="w-full text-center px-4 py-2 text-sm hover:bg-gray-100"
              >
                 수정하기
              </button>
              <button
                onClick={() => {
                  onDelete()
                  setMenuOpen(false)
                }}
                className="w-full text-center px-4 py-2 text-sm hover:bg-gray-100 text-red-500"
              >
                 삭제하기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
