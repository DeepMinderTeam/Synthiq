'use client'

import React from 'react'
import { Grid as GridIcon, List as ListIcon } from 'lucide-react'
import LogoutButton from '@/components/LogoutButton'

interface HeaderProps {
  searchQuery: string
  onSearchChange: (q: string) => void
  viewMode: 'grid' | 'list'
  setViewMode: (mode: 'grid' | 'list') => void
  onToggleAddForm: () => void
}

export default function Header({
  searchQuery,
  onSearchChange,
  viewMode,
  setViewMode,
  onToggleAddForm,
}: HeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold bg-white px-4 py-2 rounded">
        로고 DeepMinder
      </h1>
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="검색어를 입력하세요"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="border p-2 rounded w-64"
        />
        <button
          onClick={onToggleAddForm}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          토픽 추가하기
        </button>
        <button
          onClick={() => setViewMode('grid')}
          className={`p-2 rounded ${
            viewMode === 'grid' ? 'bg-gray-200' : 'hover:bg-gray-100'
          }`}
        >
          <GridIcon className="w-5 h-5" />
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`p-2 rounded ${
            viewMode === 'list' ? 'bg-gray-200' : 'hover:bg-gray-100'
          }`}
        >
          <ListIcon className="w-5 h-5" />
        </button>
        <LogoutButton />
      </div>
    </div>
  )
}
