// 논문 요약 단계를 표시하는 컴포넌트
// Supabase에서 실제 논문 요약 정보를 가져와서 표시
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { PaperSummary } from '@/models/paper_summaries'
import { Paper } from '@/models/paper'
import AISummaryStep from '../summary/AISummaryStep'
import SelfSummaryStep from '../summary/SelfSummaryStep'

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
  const [isSaving, setIsSaving] = useState(false)
  const [currentSummaryId, setCurrentSummaryId] = useState<number>(0)

  useEffect(() => {
    fetchData()
  }, [paperId])

  // 나의 정리노트 탭으로 이동할 때 기존 내용 로드
  useEffect(() => {
    if (activeTab === 'self' && summaries.length > 0) {
      // 기존 사용자 요약이 있으면 로드
      if (summaries[0].summary_text_self) {
      setSelfSummary(summaries[0].summary_text_self)
      } else {
        // 기존 사용자 요약이 없으면 빈 문자열로 초기화
        setSelfSummary('')
      }
    }
  }, [activeTab, summaries])

  // 컴포넌트 마운트 시 자동으로 사용자 요약 로드
  useEffect(() => {
    if (summaries.length > 0) {
      setCurrentSummaryId(summaries[0].summary_id)
      
      // 먼저 localStorage에서 백업된 내용 확인
      const backupKey = `selfSummary_${paperId}`
      const backupContent = localStorage.getItem(backupKey)
      
      if (summaries[0].summary_text_self) {
        setSelfSummary(summaries[0].summary_text_self)
        // 서버에 저장된 내용이 있으면 localStorage 백업 업데이트
        localStorage.setItem(backupKey, summaries[0].summary_text_self)
      } else if (backupContent) {
        // 서버에 저장된 내용이 없지만 localStorage에 백업이 있으면 복원
        setSelfSummary(backupContent)
        setMessage('📝 이전에 작성한 내용을 복원했습니다.')
        setTimeout(() => setMessage(null), 3000)
      }
    }
  }, [summaries, paperId])

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
        const errorData = await response.json()
        throw new Error(errorData.error || '사용자 요약 저장에 실패했습니다.')
      }

      const result = await response.json()

      if (showMessage) {
        setMessage('✅ 사용자 요약이 저장되었습니다!')
        setTimeout(() => setMessage(null), 2000)
      }
      
      // summaryId 업데이트
      if (result.summaryId) {
        setCurrentSummaryId(result.summaryId)
      }
      
      // localStorage 백업 정리 (서버에 저장되었으므로)
      const backupKey = `selfSummary_${paperId}`
      localStorage.removeItem(backupKey)
      
      // 데이터 새로고침
      fetchData()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '사용자 요약 저장 중 오류가 발생했습니다.'
      setError(errorMessage)
      
      // 저장 실패 시 3초 후 자동 재시도
      setTimeout(() => {
        if (selfSummary.trim()) {
          saveSelfSummary(summaryId, false)
        }
      }, 3000)
    } finally {
      setIsSaving(false)
    }
  }

  // 내용 변경 함수 (로컬 저장만)
  const handleSelfSummaryChange = (value: string) => {
    setSelfSummary(value)
    
    // localStorage에 즉시 백업
    const backupKey = `selfSummary_${paperId}`
    localStorage.setItem(backupKey, value)
  }

  // blur 시 서버 저장 함수
  const handleSelfSummaryBlur = (value: string) => {
    if (value.trim()) {
      saveSelfSummary(currentSummaryId, false) // 메시지 없이 저장
    }
  }



  if (loading) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-200 shadow-sm min-h-96">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">📝</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-800">논문 요약</h3>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-4 bg-gradient-to-r from-blue-200 to-purple-200 rounded-lg animate-pulse" 
                 style={{ width: `${(i % 3) * 25 + 50}%` }} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-200 shadow-sm min-h-96">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">⚠️</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-800">논문 요약</h3>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="text-red-600 font-medium">오류: {error}</div>
        </div>
        <button
          onClick={() => setError(null)}
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-sm hover:shadow-md font-semibold"
        >
          다시 시도
        </button>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm h-full flex flex-col">
      {message && (
        <div className="m-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-lg text-sm border border-blue-200 shadow-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">💬</span>
            </div>
            <span className="font-medium">{message}</span>
          </div>
        </div>
      )}

      <div className="flex-1">
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
            handleSelfSummaryBlur={handleSelfSummaryBlur}
          />
        )}
      </div>
    </div>
  )
} 