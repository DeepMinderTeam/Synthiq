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
      className="relative bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-300 p-6 hover:cursor-pointer group"
      onClick={handleCardClick}
    >
      {/* 즐겨찾기 버튼 */}
      <button
        onClick={(e) => handleButtonClick(e, handleFavoriteClick)}
        aria-label="즐겨찾기 토글"
        className={
          `absolute top-3 right-3 p-2 rounded-full transition-all duration-200
          ${fav ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'}`
        }
      >
        <StarIcon
          className="w-4 h-4"
          fill={fav ? 'currentColor' : 'none'}
          stroke="currentColor"
        />
      </button>

      {/* 설정 메뉴 토글 */}
      <button
        onClick={(e) => handleButtonClick(e, () => setMenuOpen((o) => !o))}
        aria-label="설정 메뉴 열기"
        className="absolute top-3 right-12 p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all duration-200"
      >
        <CogIcon className="w-4 h-4" />
      </button>

      {/* 설정 드롭다운 메뉴 */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute top-12 right-12 bg-white border border-gray-200 rounded-lg shadow-lg flex flex-col text-sm z-10"
        >
          <button
            onClick={(e) => handleButtonClick(e, () => { setMenuOpen(false); onEdit() })}
            className="px-4 py-2 hover:bg-gray-50 text-left transition-colors"
          >
            수정
          </button>
          <button
            onClick={(e) => handleButtonClick(e, () => { setMenuOpen(false); onDelete() })}
            className="px-4 py-2 hover:bg-gray-50 text-left text-red-500 transition-colors"
          >
            삭제
          </button>
        </div>
      )}

      {/* 카드 내용 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{title}</h3>
        </div>
        
        {description && (
          <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{description}</p>
        )}
        
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Calendar className="w-4 h-4" />
          <span>{date}</span>
        </div>
      </div>
    </div>
  )
}
