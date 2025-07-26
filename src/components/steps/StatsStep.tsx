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
        
        // 먼저 해당 논문의 test_id들을 가져옴
        const { data: tests, error: testsError } = await supabase
          .from('paper_tests')
          .select('test_id')
          .eq('test_paper_id', parseInt(paperId))

        if (testsError) {
          setError(testsError.message)
          return
        }

        if (!tests || tests.length === 0) {
          setAttempts([])
          return
        }

        const testIds = tests.map(test => test.test_id)
        console.log('StatsStep - 찾은 test_ids:', testIds)

        // 해당 test_id들의 응시 기록을 가져옴
        const { data, error } = await supabase
          .from('test_attempts')
          .select('*')
          .in('attempt_test_id', testIds)
          .order('attempt_created_at', { ascending: false })

        if (error) {
          setError(error.message)
        } else {
          console.log('StatsStep - 로드된 응시 기록:', data)
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
    
    // 소요시간이 있는 응시만 필터링
    const attemptsWithDuration = attempts.filter(attempt => attempt.attempt_duration_sec && attempt.attempt_duration_sec > 0)
    const avgDuration = attemptsWithDuration.length > 0 
      ? attemptsWithDuration.reduce((sum, attempt) => sum + (attempt.attempt_duration_sec || 0), 0) / attemptsWithDuration.length
      : 0

    console.log('StatsStep - 통계 계산:', {
      totalAttempts,
      attemptsWithDuration: attemptsWithDuration.length,
      avgScore,
      avgDuration
    })

    return {
      totalAttempts,
      avgScore: Math.round(avgScore),
      avgDurationSeconds: Math.round(avgDuration), // 초 단위
      avgDurationMinutes: Math.floor(avgDuration / 60), // 분 단위
      avgDurationRemainingSeconds: Math.round(avgDuration % 60), // 나머지 초
      attemptsWithDuration: attemptsWithDuration.length
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
    <div className="h-full flex flex-col">
      {stats ? (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="p-4 bg-green-50 rounded-lg text-center border border-green-100">
            <div className="text-xl font-bold text-green-600">{stats.avgScore}%</div>
            <div className="text-xs text-gray-600">평균 정답률</div>
          </div>
          {stats.attemptsWithDuration > 0 ? (
            <div className="p-4 bg-blue-50 rounded-lg text-center border border-blue-100">
              <div className="text-xl font-bold text-blue-600">
                {String(stats.avgDurationMinutes).padStart(2, '0')}:{String(stats.avgDurationRemainingSeconds).padStart(2, '0')}
              </div>
              <div className="text-xs text-gray-600">평균 소요시간</div>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg text-center border border-gray-100">
              <div className="text-xl font-bold text-gray-600">-</div>
              <div className="text-xs text-gray-600">소요시간 없음</div>
            </div>
          )}
          <div className="p-4 bg-purple-50 rounded-lg text-center border border-purple-100 col-span-2">
            <div className="text-xl font-bold text-purple-600">{stats.totalAttempts}</div>
            <div className="text-xs text-gray-600">총 응시 횟수</div>
          </div>
        </div>
      ) : (
        <div className="text-gray-500 text-center py-8">응시 기록이 없습니다.</div>
      )}
      
      {attempts.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          <h3 className="font-semibold mb-3 text-gray-700">최근 응시 기록</h3>
          <div className="space-y-2">
            {attempts.slice(0, 5).map((attempt) => (
              <div key={attempt.attempt_id} className="p-3 bg-gray-50 rounded-lg text-sm border border-gray-100">
                <div className="flex justify-between">
                  <span className="text-gray-700">점수: {attempt.attempt_score || 0}점</span>
                  <span className="text-gray-700">
                    소요시간: {attempt.attempt_duration_sec && attempt.attempt_duration_sec > 0 
                      ? `${String(Math.floor(attempt.attempt_duration_sec / 60)).padStart(2, '0')}:${String(attempt.attempt_duration_sec % 60).padStart(2, '0')}` 
                      : '기록 없음'}
                  </span>
                </div>
                <div className="text-gray-500 text-xs mt-1">
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