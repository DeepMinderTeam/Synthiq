import { useCallback } from 'react'
import { useAuth } from './useAuth'

export const useRecentViews = () => {
  const { user } = useAuth()

  const updateRecentView = useCallback(async (type: 'topic' | 'paper', itemId: number) => {
    if (!user?.id) return

    try {
      const response = await fetch('/api/update-recent-view', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          type,
          itemId
        }),
      })

      if (!response.ok) {
        console.error('최근 본 기록 업데이트 실패')
      }
    } catch (error) {
      console.error('최근 본 기록 업데이트 오류:', error)
    }
  }, [user?.id])

  return { updateRecentView }
} 