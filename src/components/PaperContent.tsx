// 논문 내용을 표시하는 왼쪽 회색 박스 컴포넌트
// Supabase에서 실제 논문 콘텐츠를 가져와서 표시
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { PaperContent as PaperContentType } from '@/models/paper_contents'

interface PaperContentProps {
  paperId: string
}

export default function PaperContent({ paperId }: PaperContentProps) {
  const [contents, setContents] = useState<PaperContentType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPaperContents = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('paper_contents')
          .select('*')
          .eq('content_paper_id', paperId)
          .order('content_index', { ascending: true })

        if (error) {
          setError(error.message)
        } else {
          setContents(data || [])
        }
      } catch (err) {
        setError('논문 내용을 불러오는 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    if (paperId) {
      fetchPaperContents()
    }
  }, [paperId])

  if (loading) {
    return (
      <div className="bg-gray-200 p-6 rounded-lg min-h-96">
        <h3 className="text-lg font-semibold mb-4">논문 내용</h3>
        <div className="space-y-2">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="h-4 bg-gray-300 rounded animate-pulse" 
                 style={{ width: `${Math.random() * 80 + 20}%` }} />
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
    <div className="bg-gray-200 p-6 rounded-lg min-h-96">
      <h3 className="text-lg font-semibold mb-4">논문 내용</h3>
      <div className="space-y-4">
        {contents.length > 0 ? (
          contents.map((content) => (
            <div key={content.content_id} className="space-y-2">
              {content.content_type && (
                <div className="text-sm font-medium text-gray-600">
                  {content.content_type}
                </div>
              )}
              <div className="text-gray-800 whitespace-pre-wrap">
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