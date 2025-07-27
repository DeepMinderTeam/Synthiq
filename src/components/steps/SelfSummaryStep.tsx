import { useState, useEffect } from 'react'

interface SelfSummaryStepProps {
  selfSummary: string
  isSaving: boolean
  handleSelfSummaryChange: (value: string) => void
}

export default function SelfSummaryStep({ selfSummary, isSaving, handleSelfSummaryChange }: SelfSummaryStepProps) {
  // 마크다운을 HTML로 변환하는 함수
  const markdownToHtml = (markdown: string): string => {
    if (!markdown) return ''
    
    return markdown
      // 제목 변환
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // 굵게
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // 기울임
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // 코드
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>')
      // 링크
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:underline">$1</a>')
      // 줄바꿈
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      // 단락 감싸기
      .replace(/^(?!<[h|p|a|strong|em|code]).*/gm, '<p>$&</p>')
      // 빈 단락 정리
      .replace(/<p><\/p>/g, '')
      .replace(/<p><br><\/p>/g, '<br>')
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-medium text-green-600">✏️ 나의 정리노트</span>
          <div className="flex items-center gap-2">
            {isSaving && (
              <span className="text-xs text-gray-500">💾 저장 중...</span>
            )}
          </div>
        </div>
        
        {/* 노션 스타일 마크다운 편집기 */}
        <div 
          className="prose prose-sm max-w-none text-gray-700 bg-white p-4 rounded border border-gray-200 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all"
          style={{ minHeight: '297mm', maxHeight: '297mm', overflowY: 'auto' }}
        >
          <div
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => handleSelfSummaryChange(e.currentTarget.textContent || '')}
            onBlur={(e) => handleSelfSummaryChange(e.currentTarget.textContent || '')}
            className="outline-none whitespace-pre-wrap break-words min-h-full text-left"
            style={{ 
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              fontSize: '14px',
              lineHeight: '1.6',
              color: '#374151',
              direction: 'ltr',
              textAlign: 'left',
              unicodeBidi: 'embed',
              writingMode: 'horizontal-tb'
            }}
            dangerouslySetInnerHTML={{
              __html: markdownToHtml(selfSummary) || ''
            }}
            dir="ltr"
          />
        </div>
      </div>
    </div>
  )
} 