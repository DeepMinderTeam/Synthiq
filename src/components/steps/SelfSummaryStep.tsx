import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

// TipTap 에디터를 동적으로 import하여 SSR 문제 해결
const TipTapEditor = dynamic(() => import('@/components/steps/TipTapEditor'), { 
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
}

export default function SelfSummaryStep({ selfSummary, isSaving, handleSelfSummaryChange }: SelfSummaryStepProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-medium text-green-600">✏️ 나의 정리노트</span>
          <div className="flex items-center gap-2">
            {isSaving ? (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs text-blue-600 font-medium">저장 중...</span>
              </div>
            ) : (
              <span className="text-xs text-green-600 font-medium">✓ 자동 저장됨</span>
            )}
          </div>
        </div>
        
        <TipTapEditor 
          content={selfSummary}
          onUpdate={handleSelfSummaryChange}
        />
      </div>
    </div>
  )
} 