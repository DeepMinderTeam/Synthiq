import { useState, useEffect, useCallback } from 'react'
import { PaperHighlight, CreateHighlightRequest, UpdateHighlightRequest } from '@/models/paper_highlights'

interface UseHighlightsProps {
  paperId: string
  contentId?: string
  pageId?: string
}

export function useHighlights({ paperId, contentId, pageId }: UseHighlightsProps) {
  const [highlights, setHighlights] = useState<PaperHighlight[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 하이라이트 목록 조회
  const fetchHighlights = useCallback(async () => {
    if (!paperId) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ paperId })
      if (contentId) params.append('contentId', contentId)
      if (pageId) params.append('pageId', pageId)

      const response = await fetch(`/api/highlights?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '하이라이트를 불러올 수 없습니다.')
      }

      setHighlights(data.highlights || [])
    } catch (err) {
      console.error('하이라이트 조회 오류:', err)
      setError(err instanceof Error ? err.message : '하이라이트 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [paperId, contentId, pageId])

  // 하이라이트 생성
  const createHighlight = useCallback(async (highlightData: Omit<CreateHighlightRequest, 'paperId'>) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/highlights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...highlightData,
          paperId: parseInt(paperId)
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '하이라이트를 생성할 수 없습니다.')
      }

      // 새 하이라이트를 목록에 추가
      setHighlights(prev => [...prev, data.highlight])
      return data.highlight
    } catch (err) {
      console.error('하이라이트 생성 오류:', err)
      setError(err instanceof Error ? err.message : '하이라이트 생성 중 오류가 발생했습니다.')
      throw err
    } finally {
      setLoading(false)
    }
  }, [paperId])

  // 하이라이트 수정
  const updateHighlight = useCallback(async (highlightId: number, updateData: Omit<UpdateHighlightRequest, 'highlightId'>) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/highlights', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          highlightId,
          ...updateData
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '하이라이트를 수정할 수 없습니다.')
      }

      // 수정된 하이라이트로 목록 업데이트
      setHighlights(prev => prev.map(h => h.highlight_id === highlightId ? data.highlight : h))
      return data.highlight
    } catch (err) {
      console.error('하이라이트 수정 오류:', err)
      setError(err instanceof Error ? err.message : '하이라이트 수정 중 오류가 발생했습니다.')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // 하이라이트 삭제
  const deleteHighlight = useCallback(async (highlightId: number) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/highlights?highlightId=${highlightId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '하이라이트를 삭제할 수 없습니다.')
      }

      // 삭제된 하이라이트를 목록에서 제거
      setHighlights(prev => prev.filter(h => h.highlight_id !== highlightId))
      return true
    } catch (err) {
      console.error('하이라이트 삭제 오류:', err)
      setError(err instanceof Error ? err.message : '하이라이트 삭제 중 오류가 발생했습니다.')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // 하이라이트 목록 새로고침
  const refreshHighlights = useCallback(() => {
    fetchHighlights()
  }, [fetchHighlights])

  // 컴포넌트 마운트 시 하이라이트 조회
  useEffect(() => {
    fetchHighlights()
  }, [fetchHighlights])

  return {
    highlights,
    loading,
    error,
    createHighlight,
    updateHighlight,
    deleteHighlight,
    refreshHighlights
  }
} 