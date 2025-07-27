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
    <>


      {/* AI 요약 목록 */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {summaries.length > 0 ? (
          summaries.map((summary) => (
            <div key={summary.summary_id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
                  🤖 {summary.summary_type}
                </span>
              </div>
              
              {/* AI 요약 */}
              <div className="prose prose-sm max-w-none text-gray-700 bg-gray-50 p-3 rounded" style={{ minHeight: '297mm', maxHeight: '297mm', overflowY: 'auto' }}>
                <ReactMarkdown>{summary.summary_text}</ReactMarkdown>
              </div>
            </div>
          ))
        ) : (
          <div className="text-gray-500 text-center py-6">
            아직 AI 정리노트가 없습니다.
          </div>
        )}
      </div>
    </>
  )
} 