'use client'

import React from 'react'
import { useRouter } from 'next/navigation'

export default function TopBar() {
  const router = useRouter()

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-10">
      <div className="flex items-center justify-between">
        {/* DeepMinder 로고 */}
        <div className="flex items-center">
          <h1 
            className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => router.push('/topics')}
          >
            DeepMinder
          </h1>
        </div>
      </div>
    </div>
  )
} 