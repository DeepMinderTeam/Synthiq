// 논문 읽기 단계를 표시하는 컴포넌트
// Supabase에서 실제 논문 정보를 가져와서 표시
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Paper } from '@/models/paper'
import dynamic from 'next/dynamic'

// PdfViewer를 동적으로 import하여 SSR 문제 해결
const PdfViewer = dynamic(() => import('../pdf/PdfViewer'), { ssr: false })

interface ReadingStepProps {
  paperId: string
}

export default function ReadingStep({ paperId }: ReadingStepProps) {
  const [paper, setPaper] = useState<Paper | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPaper = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('paper')
          .select('*')
          .eq('paper_id', paperId)
          .single()

        if (error) {
          setError(error.message)
        } else {
          setPaper(data)
        }
      } catch (err) {
        setError('논문 정보를 불러오는 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    if (paperId) {
      fetchPaper()
    }
  }, [paperId])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-300 rounded animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 16 }, (_, i) => (
            <div key={i} className="h-4 bg-gray-300 rounded animate-pulse" 
                 style={{ width: `${(i % 3) * 20 + 60}%` }} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">논문 읽기</h2>
        <div className="text-red-500">오류: {error}</div>
      </div>
    )
  }

  if (!paper) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">논문 읽기</h2>
        <div className="text-gray-500">논문을 찾을 수 없습니다.</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-4">{paper.paper_title}</h2>
        {paper.paper_abstract && (
          <div className="space-y-2 mb-6">
            <h3 className="font-semibold">초록</h3>
            <div className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
              {paper.paper_abstract}
            </div>
          </div>
        )}
      </div>
      
      {paper.paper_url && (
        <div className="space-y-4">
          <h3 className="font-semibold">논문 PDF</h3>
          <PdfViewer 
            filePath={paper.paper_url} 
            title={paper.paper_title}
          />
        </div>
      )}
    </div>
  )
} 