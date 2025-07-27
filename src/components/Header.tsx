// src/components/Header.tsx
'use client'

import React from 'react'
import { Squares2X2Icon, Bars3Icon } from '@heroicons/react/24/outline'
import LogoutButton from '@/components/ui/LogoutButton'

interface HeaderProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  viewMode: 'grid' | 'list'
  setViewMode: (mode: 'grid' | 'list') => void
  onToggleAddForm?: () => void
  addButtonLabel?: string // ✅ 추가
}

export default function Header({
  searchQuery,
  onSearchChange,
  viewMode,
  setViewMode,
  onToggleAddForm,
  addButtonLabel = '논문 추가하기', // ✅ 기본값을 "논문 추가하기"로
}: HeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
      {/* 왼쪽: 검색창 */}
      <div className="flex-1">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="검색어를 입력하세요..."
          className="w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 오른쪽: 보기 모드 & 추가 버튼 & 로그아웃 */}
      <div className="flex items-center space-x-2">
        {/* 보기 모드 전환 */}
        <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-md">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md ${
              viewMode === 'grid'
                ? 'bg-blue-500 text-white'
                : 'hover:bg-gray-200'
            }`}
            title="그리드 보기"
          >
            <Squares2X2Icon className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md ${
              viewMode === 'list'
                ? 'bg-blue-500 text-white'
                : 'hover:bg-gray-200'
            }`}
            title="리스트 보기"
          >
            <Bars3Icon className="w-5 h-5" />
          </button>
        </div>

        {/* 추가 버튼 */}
        {onToggleAddForm && (
          <button
            onClick={onToggleAddForm}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 font-semibold"
          >
            {addButtonLabel} {/* ✅ props로 받은 버튼 텍스트 사용 */}
          </button>
        )}

        <LogoutButton />
      </div>
    </header>
  )
}
