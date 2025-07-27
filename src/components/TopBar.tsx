'use client'

import React from 'react'
import LogoutButton from '@/components/ui/LogoutButton'

export default function TopBar() {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center justify-between">
        {/* DeepMinder 로고 */}
        <div className="flex items-center">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            DeepMinder
          </h1>
        </div>

        {/* 로그아웃 버튼 */}
        <div className="flex items-center">
          <LogoutButton />
        </div>
      </div>
    </div>
  )
} 