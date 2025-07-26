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
  const [showTranslation, setShowTranslation] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

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

      setMessage(result.message)
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

  return (
    <div className="bg-white rounded-lg shadow-sm w-full h-full flex flex-col">
      <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">논문 내용</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTranslation(!showTranslation)}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            {showTranslation ? '원문 보기' : '번역 보기'}
          </button>
          <button
            onClick={handleTranslate}
            disabled={translating}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {translating ? '번역 중...' : '번역하기'}
          </button>
        </div>
      </div>
      
      {message && (
        <div className="px-4 sm:px-6 py-2 bg-blue-50 text-blue-700 text-sm border-b border-blue-100">
          {message}
        </div>
      )}
      
      <div className="flex-1 p-4 sm:p-6 overflow-hidden">
        {showTranslation ? (
          <div className="h-full overflow-y-auto space-y-4">
            {contents.length > 0 ? (
              contents.map((content) => (
                <div key={content.content_id} className="space-y-2">
                  {content.content_type && (
                    <div className="text-sm font-medium text-gray-600">
                      {content.content_type}
                    </div>
                  )}
                  <div className="text-gray-800 prose prose-sm max-w-none">
                    {content.content_text_eng ? (
                      <ReactMarkdown>{content.content_text_eng}</ReactMarkdown>
                    ) : (
                      <div className="text-gray-500">번역이 없습니다. 번역하기 버튼을 눌러주세요.</div>
                    )}
                  </div>
                </div>
              ))
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