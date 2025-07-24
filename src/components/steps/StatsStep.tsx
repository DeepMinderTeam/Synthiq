// 논문 통계 단계를 표시하는 컴포넌트
// Supabase에서 실제 테스트 응시 기록을 가져와서 통계 정보를 표시
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { TestAttempt } from '@/models/test_attempts'

interface StatsStepProps {
  paperId: string
}

export default function StatsStep({ paperId }: StatsStepProps) {
  const [attempts, setAttempts] = useState<TestAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAttempts = async () => {
      try {
        setLoading(true)
        // paper_tests를 통해 연결된 응시 기록들을 가져옴
        const { data, error } = await supabase
          .from('test_attempts')
          .select(`
            *,
            paper_tests!inner(test_paper_id)
          `)
          .eq('paper_tests.test_paper_id', paperId)
          .order('attempt_created_at', { ascending: false })

        if (error) {
          setError(error.message)
        } else {
          setAttempts(data || [])
        }
      } catch (err) {
        setError('통계 정보를 불러오는 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    if (paperId) {
      fetchAttempts()
    }
  }, [paperId])

  // 통계 계산
  const calculateStats = () => {
    if (attempts.length === 0) return null

    const totalAttempts = attempts.length
    const avgScore = attempts.reduce((sum, attempt) => sum + (attempt.attempt_score || 0), 0) / totalAttempts
    const avgDuration = attempts.reduce((sum, attempt) => sum + (attempt.attempt_duration_sec || 0), 0) / totalAttempts

    return {
      totalAttempts,
      avgScore: Math.round(avgScore),
      avgDuration: Math.round(avgDuration / 60) // 분 단위로 변환
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">논문 통계</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-green-50 rounded text-center">
            <div className="h-8 bg-gray-300 rounded animate-pulse mb-2" />
            <div className="text-sm text-gray-600">정답률</div>
          </div>
          <div className="p-4 bg-blue-50 rounded text-center">
            <div className="h-8 bg-gray-300 rounded animate-pulse mb-2" />
            <div className="text-sm text-gray-600">소요시간</div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">논문 통계</h2>
        <div className="text-red-500">오류: {error}</div>
      </div>
    )
  }

  const stats = calculateStats()

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">논문 통계</h2>
      {stats ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-green-50 rounded text-center">
            <div className="text-2xl font-bold text-green-600">{stats.avgScore}%</div>
            <div className="text-sm text-gray-600">평균 정답률</div>
          </div>
          <div className="p-4 bg-blue-50 rounded text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.avgDuration}분</div>
            <div className="text-sm text-gray-600">평균 소요시간</div>
          </div>
          <div className="p-4 bg-purple-50 rounded text-center col-span-2">
            <div className="text-2xl font-bold text-purple-600">{stats.totalAttempts}</div>
            <div className="text-sm text-gray-600">총 응시 횟수</div>
          </div>
        </div>
      ) : (
        <div className="text-gray-500">응시 기록이 없습니다.</div>
      )}
      
      {attempts.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold mb-3">최근 응시 기록</h3>
          <div className="space-y-2">
            {attempts.slice(0, 5).map((attempt) => (
              <div key={attempt.attempt_id} className="p-3 bg-gray-50 rounded text-sm">
                <div className="flex justify-between">
                  <span>점수: {attempt.attempt_score || 0}점</span>
                  <span>소요시간: {Math.round((attempt.attempt_duration_sec || 0) / 60)}분</span>
                </div>
                <div className="text-gray-500 text-xs">
                  {new Date(attempt.attempt_created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 