// 논문 요약 단계를 표시하는 컴포넌트
// Supabase에서 실제 논문 요약 정보를 가져와서 표시
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { PaperSummary } from '@/models/paper_summaries'

interface SummaryStepProps {
  paperId: string
}

export default function SummaryStep({ paperId }: SummaryStepProps) {
  const [summaries, setSummaries] = useState<PaperSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSummaries = async () => {
      try {
        setLoading(true)
        // paper_contents를 통해 연결된 요약들을 가져옴
        const { data, error } = await supabase
          .from('paper_summaries')
          .select(`
            *,
            paper_contents!inner(content_paper_id)
          `)
          .eq('paper_contents.content_paper_id', paperId)
          .order('summary_id', { ascending: true })

        if (error) {
          setError(error.message)
        } else {
          setSummaries(data || [])
        }
      } catch (err) {
        setError('요약 정보를 불러오는 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    if (paperId) {
      fetchSummaries()
    }
  }, [paperId])

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">DeepMinder&apos;s 요약</h2>
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="space-y-2">
              <div className="font-semibold">{index + 1}.</div>
              {Array.from({ length: 3 }, (_, i) => (
                <div
                  key={i}
                  className="h-3 bg-gray-300 rounded animate-pulse"
                  style={{ width: `${Math.random() * 80 + 20}%` }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">DeepMinder&apos;s 요약</h2>
        <div className="text-red-500">오류: {error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">DeepMinder&apos;s 요약</h2>
      <div className="space-y-4">
        {summaries.length > 0 ? (
          summaries.map((summary, index) => (
            <div key={summary.summary_id} className="space-y-2">
              <div className="font-semibold">
                {summary.summary_type || `${index + 1}.`}
              </div>
              <div className="text-gray-700 whitespace-pre-wrap">
                {summary.summary_text}
              </div>
            </div>
          ))
        ) : (
          <div className="text-gray-500">요약 정보가 없습니다.</div>
        )}
      </div>
    </div>
  )
}
