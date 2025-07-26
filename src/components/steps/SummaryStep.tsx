// 논문 요약 단계를 표시하는 컴포넌트
// Supabase에서 실제 논문 요약 정보를 가져와서 표시
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { PaperSummary } from '@/models/paper_summaries'
import { Paper } from '@/models/paper'
import AISummaryStep from './AISummaryStep'
import SelfSummaryStep from './SelfSummaryStep'

interface SummaryStepProps {
  paperId: string
  activeTab: 'ai' | 'self'
}

export default function SummaryStep({ paperId, activeTab }: SummaryStepProps) {
  const [paper, setPaper] = useState<Paper | null>(null)
  const [summaries, setSummaries] = useState<PaperSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [selfSummary, setSelfSummary] = useState('')
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchData()
  }, [paperId])

  // 나의 정리노트 탭으로 이동할 때 기존 내용 로드
  useEffect(() => {
    if (activeTab === 'self' && summaries.length > 0 && summaries[0].summary_text_self) {
      setSelfSummary(summaries[0].summary_text_self)
    }
  }, [activeTab, summaries])

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

      // 논문의 모든 문단 content_id 가져오기
      const { data: contents, error: contentsError } = await supabase
        .from('paper_contents')
        .select('content_id')
        .eq('content_paper_id', paperId)

      if (contentsError) {
        setError('문단 정보를 불러오는 중 오류가 발생했습니다.')
        setLoading(false)
        return
      }

      const contentIds = contents?.map(c => c.content_id) ?? [];

      if (contentIds.length === 0) {
        setSummaries([])
        setLoading(false)
        return
      }

      // summary_content_id가 contentIds 중 하나인 요약 모두 가져오기
      const { data: summariesData, error: summariesError } = await supabase
        .from('paper_summaries')
        .select('*')
        .in('summary_content_id', contentIds)
        .order('summary_id', { ascending: true })

      if (summariesError) {
        console.error('요약 로드 오류:', summariesError)
      } else {
        setSummaries(summariesData || [])
      }
    } catch (err) {
      setError('요약 정보를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const extractPdfText = async () => {
    if (!paper?.paper_url) {
      setError('PDF 파일이 없습니다.')
      return
    }

    try {
      setExtracting(true)
      setError(null)
      setMessage('PDF에서 텍스트를 추출하고 있습니다...')

      const response = await fetch('/api/extract-pdf-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paperId: parseInt(paperId),
          filePath: paper.paper_url
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '텍스트 추출에 실패했습니다.')
      }

      setMessage(result.message)
      setTimeout(() => setMessage(null), 3000)
      
      // 텍스트 추출 후 데이터 새로고침
      fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : '텍스트 추출 중 오류가 발생했습니다.')
    } finally {
      setExtracting(false)
    }
  }

  const generateAISummary = async () => {
    try {
      setGenerating(true)
      setError(null)
      setMessage('🤖 AI가 정리노트를 생성하고 있습니다...')

      const response = await fetch('/api/classify-and-summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paperId: parseInt(paperId)
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '정리노트 생성에 실패했습니다.')
      }

      setMessage(`✅ AI 정리노트가 완료되었습니다! (${result.summaryCount}개 정리노트 생성)`)
      setTimeout(() => setMessage(null), 5000)
      
      // 요약 목록 새로고침
      fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : '정리노트 생성 중 오류가 발생했습니다.')
    } finally {
      setGenerating(false)
    }
  }

  const saveSelfSummary = async (summaryId: number, showMessage = true) => {
    if (!selfSummary.trim()) return
    
    try {
      setIsSaving(true)
      const response = await fetch('/api/save-self-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summaryId,
          summaryText: selfSummary
        }),
      })

      if (!response.ok) {
        throw new Error('사용자 요약 저장에 실패했습니다.')
      }

      if (showMessage) {
        setMessage('✅ 사용자 요약이 저장되었습니다!')
        setTimeout(() => setMessage(null), 2000)
      }
      
      // 데이터 새로고침
      fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : '사용자 요약 저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  // 자동 저장 함수
  const handleSelfSummaryChange = (value: string) => {
    setSelfSummary(value)
    
    // 기존 타이머 취소
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer)
    }
    
    // 2초 후 자동 저장
    const timer = setTimeout(() => {
      if (value.trim()) {
        saveSelfSummary(0, false) // 메시지 없이 저장
      }
    }, 2000)
    
    setAutoSaveTimer(timer)
  }

  if (loading) {
    return (
      <div className="bg-gray-200 p-6 rounded-lg min-h-96">
        <h3 className="text-lg font-semibold mb-4">논문 요약</h3>
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-4 bg-gray-300 rounded animate-pulse" 
                 style={{ width: `${(i % 3) * 25 + 50}%` }} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-200 p-6 rounded-lg min-h-96">
        <h3 className="text-lg font-semibold mb-4">논문 요약</h3>
        <div className="text-red-500 mb-4">오류: {error}</div>
        <button
          onClick={() => setError(null)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          다시 시도
        </button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {message && (
        <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
          {message}
        </div>
      )}



      {/* 탭 내용 */}
      {activeTab === 'ai' && (
        <AISummaryStep 
          summaries={summaries}
          generating={generating}
          generateAISummary={generateAISummary}
        />
      )}

      {/* 나의 정리노트 탭 내용 */}
      {activeTab === 'self' && (
        <SelfSummaryStep 
          selfSummary={selfSummary}
          isSaving={isSaving}
          handleSelfSummaryChange={handleSelfSummaryChange}
        />
      )}
    </div>
  )
} 