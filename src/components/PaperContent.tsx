// 논문 내용을 표시하는 컴포넌트
// ReadingStep 컴포넌트를 재사용하여 논문 정보와 PDF를 표시
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { PaperContent as PaperContentType } from '@/models/paper_contents'
import ReadingStep from './steps/ReadingStep'
import ReactMarkdown from 'react-markdown'

interface PaperContentProps {
  paperId: string
}

export default function PaperContent({ paperId }: PaperContentProps) {
  const [contents, setContents] = useState<PaperContentType[]>([])
  const [activeTab, setActiveTab] = useState<'original' | 'translation'>('original')
  const [translating, setTranslating] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(0)

  useEffect(() => {
    fetchContents()
  }, [paperId])

  const fetchContents = async () => {
    try {
      const { data, error } = await supabase
        .from('paper_contents')
        .select('*')
        .eq('content_paper_id', paperId)
        .order('content_index', { ascending: true })

      if (error) {
        console.error('논문 내용 로드 오류:', error)
      } else {
        setContents(data || [])
      }
    } catch (err) {
      console.error('논문 내용 로드 오류:', err)
    }
  }

  const handleTranslate = async () => {
    try {
      setTranslating(true)
      setMessage('번역을 생성하고 있습니다...')

      const response = await fetch('/api/translate-paper', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paperId }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '번역에 실패했습니다.')
      }

      setMessage('번역이 완료되었습니다!')
      setTimeout(() => setMessage(null), 3000)
      
      // 번역 후 데이터 새로고침
      fetchContents()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '번역 중 오류가 발생했습니다.')
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setTranslating(false)
    }
  }

  const handlePageChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentPage > 0) {
      setCurrentPage(currentPage - 1)
    } else if (direction === 'next' && currentPage < contents.length - 1) {
      setCurrentPage(currentPage + 1)
    }
  }

  const handleTabChange = (tab: 'original' | 'translation') => {
    setActiveTab(tab)
    if (tab === 'translation') {
      setCurrentPage(0) // 번역 모드 전환 시 첫 페이지로
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm w-full h-full flex flex-col">
      <div className="p-4 sm:p-6 border-b border-gray-100">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">논문 내용</h3>
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => handleTabChange('original')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === 'original'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              📄 원문 보기
            </button>
            <button
              onClick={() => handleTabChange('translation')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === 'translation'
                  ? 'bg-green-500 text-white'
                  : 'bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              🌐 번역 보기
            </button>
          </div>
        </div>
      </div>
      
      {message && (
        <div className="px-4 sm:px-6 py-2 bg-blue-50 text-blue-700 text-sm border-b border-blue-100">
          {message}
        </div>
      )}
      
      <div className="flex-1 p-4 sm:p-6 overflow-hidden">
        {activeTab === 'translation' ? (
          <div className="h-full flex flex-col">
            {/* AI 번역 버튼 */}
            <div className="mb-4 flex-shrink-0 flex justify-end">
              <button
                onClick={handleTranslate}
                disabled={translating}
                className="px-3 py-1 text-xs font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600 rounded disabled:bg-gray-300 disabled:cursor-not-allowed hover:from-blue-600 hover:to-purple-700 transition-colors"
              >
                {translating ? '번역 중...' : '✨ AI 번역'}
              </button>
            </div>
            {contents.length > 0 ? (
              <>
                {/* 페이지네이션 헤더 */}
                <div className="flex justify-between items-center mb-4 px-2">
                  <button
                    onClick={() => handlePageChange('prev')}
                    disabled={currentPage === 0}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    ← 이전
                  </button>
                  <span className="text-sm text-gray-600">
                    {currentPage + 1} / {contents.length}
                  </span>
                  <button
                    onClick={() => handlePageChange('next')}
                    disabled={currentPage === contents.length - 1}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    다음 →
                  </button>
                </div>
                
                {/* 현재 페이지 내용 */}
                <div className="flex-1 overflow-y-auto">
                  <div className="space-y-2">
                    {contents[currentPage].content_type && (
                      <div className="text-sm font-medium text-gray-600 bg-gray-50 px-2 py-1 rounded">
                        {contents[currentPage].content_type}
                      </div>
                    )}
                    <div className="text-gray-800 prose prose-sm max-w-none" style={{ minHeight: '297mm', maxHeight: '297mm', overflowY: 'auto' }}>
                      {contents[currentPage].content_text_eng ? (
                        <ReactMarkdown>{contents[currentPage].content_text_eng}</ReactMarkdown>
                      ) : (
                        <div className="text-gray-500">번역이 없습니다. 번역하기 버튼을 눌러주세요.</div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-gray-500">논문 내용이 없습니다.</div>
            )}
          </div>
        ) : (
          <ReadingStep paperId={paperId} />
        )}
      </div>
    </div>
  )
} 