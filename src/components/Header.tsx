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
  onOpenModal: () => void

}

export default function Header({
  searchQuery,
  onSearchChange,
  viewMode,
  setViewMode,
  onOpenModal,
}: HeaderProps) {
  const router = useRouter()


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
        <button
          onClick={onOpenModal}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          토픽 추가하기
        </button>
        <button
          onClick={() => setViewMode('grid')}
          className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
        >
          <GridIcon className="w-5 h-5" />
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`p-2 rounded ${viewMode === 'list' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
        >
          <ListIcon className="w-5 h-5" />
        </button>

        <LogoutButton />
      </div>
    </header>
  )
}
