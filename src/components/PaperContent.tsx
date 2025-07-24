// 논문 내용을 표시하는 왼쪽 회색 박스 컴포넌트
// Supabase에서 실제 논문 콘텐츠를 가져와서 표시
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { PaperContent as PaperContentType } from '@/models/paper_contents'
import { Paper } from '@/models/paper'
import dynamic from 'next/dynamic'

// PdfViewer를 동적으로 import하여 SSR 문제 해결
const PdfViewer = dynamic(() => import('./PdfViewer'), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-300 rounded animate-pulse" />
})

interface PaperContentProps {
  paperId: string
}

export default function PaperContent({ paperId }: PaperContentProps) {
  const [contents, setContents] = useState<PaperContentType[]>([])
  const [paper, setPaper] = useState<Paper | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // 논문 정보 가져오기
        const { data: paperData, error: paperError } = await supabase
          .from('paper')
          .select('*')
          .eq('paper_id', paperId)
          .single()

        if (paperError) {
          setError(paperError.message)
          return
        }

        setPaper(paperData)

        // 논문 내용 가져오기
        const { data: contentsData, error: contentsError } = await supabase
          .from('paper_contents')
          .select('*')
          .eq('content_paper_id', paperId)
          .order('content_index', { ascending: true })

        if (contentsError) {
          console.error('논문 내용 로드 오류:', contentsError)
        } else {
          setContents(contentsData || [])
        }
      } catch (err) {
        setError('논문 정보를 불러오는 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    if (paperId) {
      fetchData()
    }
  }, [paperId])

  if (loading) {
    return (
      <div className="bg-gray-200 p-6 rounded-lg min-h-96">
        <h3 className="text-lg font-semibold mb-4">논문 내용</h3>
        <div className="space-y-2">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="h-4 bg-gray-300 rounded animate-pulse" 
                 style={{ width: `${(i + 1) * 10 + 20}%` }} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-200 p-6 rounded-lg min-h-96">
        <h3 className="text-lg font-semibold mb-4">논문 내용</h3>
        <div className="text-red-500">오류: {error}</div>
      </div>
    )
  }

  return (
    <div className="bg-gray-200 p-4 sm:p-6 rounded-lg min-h-96 w-full overflow-hidden">
      <h3 className="text-lg font-semibold mb-4">논문 내용</h3>
      
      {/* PDF 뷰어 */}
      {paper?.paper_url && (
        <div className="mb-6 w-full">
          <PdfViewer 
            filePath={paper.paper_url} 
            title={paper.paper_title}
          />
        </div>
      )}
      
      {/* 논문 내용 텍스트 */}
      <div className="space-y-4">
        {contents.length > 0 ? (
          contents.map((content) => (
            <div key={content.content_id} className="space-y-2">
              {content.content_type && (
                <div className="text-sm font-medium text-gray-600">
                  {content.content_type}
                </div>
              )}
              <div className="text-gray-800 whitespace-pre-wrap break-words">
                {content.content_text}
              </div>
            </div>
          ))
        ) : (
          <div className="text-gray-500">논문 내용이 없습니다.</div>
        )}
      </div>
    </div>
  )
} 