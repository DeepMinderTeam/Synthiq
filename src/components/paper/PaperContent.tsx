// 논문 내용을 표시하는 컴포넌트
// ReadingStep 컴포넌트를 재사용하여 논문 정보와 PDF를 표시
'use client'


import { useState, useEffect, useCallback, useMemo } from 'react'
import { PaperContent as PaperContentType } from '@/models/paper_contents'
import { Paper } from '@/models/paper'
import PaperInfo from './PaperInfo'
import ReactMarkdown from 'react-markdown'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabaseClient'
import { useAIAnalysis } from '@/context/AIAnalysisContext'
import React from 'react'

// PdfViewer를 동적으로 import하여 SSR 문제 해결
const PdfViewer = dynamic(() => import('../pdf/PdfViewer'), { ssr: false })

interface PaperContentProps {
  paperId: string
  topicId: string
  isCollapsed?: boolean
}

const PaperContent = React.memo(function PaperContent({ paperId, topicId, isCollapsed = false }: PaperContentProps) {
  const [contents, setContents] = useState<PaperContentType[]>([])
  const [paper, setPaper] = useState<Paper | null>(null)
  const [paperTitle, setPaperTitle] = useState<string>('')

  const [activeTab, setActiveTab] = useState<'original' | 'translation'>('original')
  const [currentPage, setCurrentPage] = useState(0)
  
  const { state, startTranslation, completeTranslation } = useAIAnalysis()
  const { isTranslating, messages } = state

  const fetchContents = useCallback(async () => {
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
  }, [paperId])

  const fetchPaper = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('paper')
        .select('*')
        .eq('paper_id', paperId)
        .single()

      if (error) {
        console.error('논문 정보 로드 오류:', error)
      } else {
        setPaper(data)
        setPaperTitle(data?.paper_title || '')
      }
    } catch (err) {
      console.error('논문 정보 로드 오류:', err)
    }
  }, [paperId])

  useEffect(() => {
    fetchContents()
    fetchPaper()
  }, [fetchContents, fetchPaper])

  const handleTranslate = useCallback(async () => {
    try {
      startTranslation(paperId, paperTitle || '논문', topicId)

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

      completeTranslation()
      
      // 번역 후 데이터 새로고침
      fetchContents()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '번역 중 오류가 발생했습니다.'
      console.error('번역 오류:', errorMessage)
    }
  }, [paperId, paperTitle, startTranslation, completeTranslation, fetchContents])


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

  // 접힌 상태일 때의 UI
  if (isCollapsed) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg shadow-sm w-full h-full flex flex-col border border-blue-100">
        <div className="p-3 border-b border-blue-200">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-sm">📄</span>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center space-y-6">
          <div className="w-6 h-6 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
          <div className="text-xs text-gray-500 text-center font-medium">
            접힘 상태
          </div>
          <div className="text-[10px] text-gray-400 text-center">
            펼치려면<br />클릭하세요
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm w-full h-full flex flex-col">
      <div className="p-4 sm:p-6 border-b border-gray-100">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">논문 내용</h3>
          <div className="flex items-center space-x-3">
            {activeTab === 'translation' && (
              <button
                onClick={handleTranslate}
                disabled={isTranslating}
                className="px-3 py-1 text-xs font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600 rounded disabled:bg-gray-300 disabled:cursor-not-allowed hover:from-blue-600 hover:to-purple-700 transition-colors"
              >
                {isTranslating ? '✨ 번역 중...' : '✨ AI 번역'}
              </button>
            )}
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
      </div>
      
      {messages.translation && (
        <div className="px-4 sm:px-6 py-2 bg-blue-50 text-blue-700 text-sm border-b border-blue-100">
          {messages.translation}
        </div>
      )}

      <div className="flex-1 p-4 sm:p-6 overflow-hidden">
        {activeTab === 'translation' ? (
          <div className="h-full flex flex-col">
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
          <div className="h-full flex flex-col space-y-4">
            {paper && <PaperInfo paper={paper} showAbstract={true} />}
            {paper?.paper_url && (
              <div className="flex-1 min-h-0">
                <h3 className="font-semibold text-gray-700 mb-3">논문 PDF</h3>
                <div className="flex-1">
                  <PdfViewer 
                    filePath={paper.paper_url} 
                    title={paper.paper_title}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
})

export default PaperContent 