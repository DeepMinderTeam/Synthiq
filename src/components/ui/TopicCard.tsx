'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Star as StarIcon, Settings as CogIcon, Calendar, BookOpen } from 'lucide-react'
import { useRouter } from 'next/navigation'

export interface TopicCardProps {
  title: string
  description?: string
  date: string
  thumbnailUrl?: string
  topicId: string
  onEdit: () => void
  onDelete: () => void
  isFavorite: boolean
  onToggleFavorite: () => void
}

export default function TopicCard({
  title,
  description = '',
  date,
  thumbnailUrl = '/placeholder.png',
  topicId,
  onEdit,
  onDelete,
  isFavorite,
  onToggleFavorite,
}: TopicCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [fav, setFav] = useState(isFavorite)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Prop 변경 시 로컬 fav 상태 동기화
  useEffect(() => {
    setFav(isFavorite)
  }, [isFavorite])

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  // 즐겨찾기 버튼 핸들러 (즉시 UI 반영)
  const handleFavoriteClick = () => {
    setFav((prev) => !prev)
    onToggleFavorite()
  }

  // 카드 클릭 핸들러
  const handleCardClick = () => {
    router.push(`/topics/${topicId}`)
  }

  // 버튼 클릭 시 이벤트 전파 방지
  const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation()
    action()
  }

  return (
    <div 
      className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg hover:border-blue-300 transition-all duration-300 group h-64 flex flex-col hover:cursor-pointer"
      onClick={handleCardClick}
    >
      {/* 상단: 제목과 즐겨찾기 */}
      <div className="p-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                {title}
              </h3>
              <div className="flex items-center space-x-2 mt-1">
                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-500 truncate">{date}</span>
              </div>
            </div>
          </div>
          
          {/* 즐겨찾기 버튼 */}
          <button
            onClick={(e) => handleButtonClick(e, handleFavoriteClick)}
            className={`p-2 rounded-lg transition-all duration-200 flex-shrink-0 ${
              fav 
                ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200' 
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
            }`}
            aria-label="즐겨찾기 토글"
          >
            <StarIcon className="w-4 h-4" fill={fav ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>

      {/* 중간: 설명 */}
      <div className="p-4 flex-1 min-h-0">
        <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
          {description || '토픽 설명이 없습니다.'}
        </p>
      </div>

      {/* 하단: 액션 버튼들 */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            {fav && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 flex-shrink-0">
                즐겨찾기
              </span>
            )}
          </div>

          <div className="relative flex-shrink-0" ref={menuRef}>
            <button
              onClick={(e) => handleButtonClick(e, () => setMenuOpen((o) => !o))}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="토픽 설정 메뉴 열기"
            >
              <CogIcon className="w-4 h-4 text-gray-500" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999]">
                <button
                  onClick={(e) => handleButtonClick(e, () => { setMenuOpen(false); onEdit() })}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors first:rounded-t-lg"
                >
                  수정하기
                </button>
                <button
                  onClick={(e) => handleButtonClick(e, () => { setMenuOpen(false); onDelete() })}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors last:rounded-b-lg"
                >
                  삭제하기
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
