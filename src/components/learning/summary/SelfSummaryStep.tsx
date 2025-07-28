import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

// TipTap 에디터를 동적으로 import하여 SSR 문제 해결
const TipTapEditor = dynamic(() => import('./TipTapEditor'), { 
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-500">에디터 로딩 중...</div>
    </div>
  )
}) as React.ComponentType<{
  content: string
  onUpdate: (content: string) => void
}>

interface SelfSummaryStepProps {
  selfSummary: string
  isSaving: boolean
  handleSelfSummaryChange: (value: string) => void
  handleSelfSummaryBlur: (value: string) => void
}

export default function SelfSummaryStep({ selfSummary, isSaving, handleSelfSummaryChange, handleSelfSummaryBlur }: SelfSummaryStepProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">✏️</span>
            </div>
            <span className="text-sm font-semibold text-green-600 bg-gradient-to-r from-green-50 to-emerald-50 px-3 py-1.5 rounded-lg border border-green-200">
              나의 정리노트
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isSaving ? (
              <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-1.5 rounded-lg border border-blue-200">
                <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs text-blue-600 font-medium">저장 중...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-gradient-to-r from-green-50 to-emerald-50 px-3 py-1.5 rounded-lg border border-green-200">
                <span className="text-xs text-green-600 font-medium">✓ 자동 저장됨</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex-1 min-h-0">
          <TipTapEditor 
            content={selfSummary}
            onUpdate={handleSelfSummaryChange}
            onBlur={handleSelfSummaryBlur}
          />
        </div>
      </div>
    </div>
  )
} 