import { useState } from 'react'
import { PaperSummary } from '@/models/paper_summaries'
import ReactMarkdown from 'react-markdown'

interface AISummaryStepProps {
  summaries: PaperSummary[]
  generating: boolean
  generateAISummary: () => void
}

export default function AISummaryStep({ summaries, generating, generateAISummary }: AISummaryStepProps) {
  return (
    <div className="h-full flex flex-col">
      {/* AI 요약 목록 */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {summaries.length > 0 ? (
          summaries.map((summary) => (
            <div key={summary.summary_id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">🤖</span>
                  </div>
                  <span className="text-sm font-semibold text-blue-600 bg-gradient-to-r from-blue-50 to-purple-50 px-3 py-1.5 rounded-lg border border-blue-200">
                    {summary.summary_type}
                  </span>
                </div>
              </div>
              
              {/* AI 요약 */}
              <div className="prose prose-sm max-w-none text-gray-700 bg-gradient-to-br from-gray-50 to-blue-50 p-6 rounded-lg border border-gray-100 shadow-sm" style={{ minHeight: '297mm', maxHeight: '297mm', overflowY: 'auto' }}>
                <ReactMarkdown>{summary.summary_text}</ReactMarkdown>
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-gray-500 text-2xl">🤖</span>
              </div>
              <div className="text-gray-500 font-medium">아직 AI 정리노트가 없습니다</div>
              <div className="text-gray-400 text-sm mt-1">AI 요약 생성 버튼을 눌러보세요</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 