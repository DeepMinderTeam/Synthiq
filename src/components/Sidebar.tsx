'use client'

import React from 'react'
import LogoutButton from '@/components/ui/LogoutButton'

interface SidebarProps {
  userName: string
}

export default function Sidebar({ userName }: SidebarProps) {
  return (
    <aside className="w-64 bg-white border-r p-6 flex flex-col">
      <div className="flex items-center mb-8">
        <div className="w-10 h-10 bg-gray-200 rounded-full" />
        <span className="ml-3 font-semibold">{userName || 'Guest'}</span>
      </div>
      <div className="mb-6">
        <h2 className="text-sm font-semibold mb-2">최근 본 목록</h2>
        <div className="h-20 bg-gray-100 rounded" />
      </div>
      <div>
        <h2 className="text-sm font-semibold mb-2">즐겨찾기</h2>
        <div className="h-20 bg-gray-100 rounded" />
      </div>
      <div className="mt-auto">
        <LogoutButton />
      </div>
    </aside>
  )
}
