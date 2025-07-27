'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Star as StarIcon, Settings as CogIcon } from 'lucide-react'

export interface TopicCardProps {
  title: string
  description?: string
  date: string
  thumbnailUrl?: string
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
  onEdit,
  onDelete,
  isFavorite,
  onToggleFavorite,
}: TopicCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [fav, setFav] = useState(isFavorite)
  const menuRef = useRef<HTMLDivElement>(null)

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

  return (
    <div className="relative bg-white border rounded-lg shadow hover:border-blue-500 hover:shadow-md transition p-4 hover:cursor-pointer">
      {/* 즐겨찾기 버튼 */}
      <button
        onClick={handleFavoriteClick}
        aria-label="즐겨찾기 토글"
        className={
          `absolute top-2 right-2 p-1 rounded-full transition
          ${fav ? 'bg-yellow-200 text-yellow-600' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`
        }
      >
        <StarIcon
          className="w-5 h-5"
          fill={fav ? 'currentColor' : 'none'}
          stroke="currentColor"
        />
      </button>

      {/* 설정 메뉴 토글 */}
      <button
        onClick={() => setMenuOpen((o) => !o)}
        aria-label="설정 메뉴 열기"
        className="absolute top-2 right-10 p-1 rounded-full text-gray-500 hover:bg-gray-100 transition"
      >
        <CogIcon className="w-5 h-5" />
      </button>

      {/* 설정 드롭다운 메뉴 */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute top-8 right-10 bg-white border rounded shadow-md flex flex-col text-sm"
        >
          <button
            onClick={() => { setMenuOpen(false); onEdit() }}
            className="px-4 py-2 hover:bg-gray-100 text-left"
          >
            수정
          </button>
          <button
            onClick={() => { setMenuOpen(false); onDelete() }}
            className="px-4 py-2 hover:bg-gray-100 text-left text-red-500"
          >
            삭제
          </button>
        </div>
      )}

      <h3 className="text-lg font-bold mb-2 mt-6">{title}</h3>
      <p className="text-sm text-gray-600 line-clamp-3 mb-2">{description}</p>
      <p className="text-xs text-gray-400 mb-4">{date}</p>
    </div>
  )
}
