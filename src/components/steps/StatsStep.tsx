// 논문 통계 단계를 표시하는 컴포넌트
// Supabase에서 실제 테스트 응시 기록을 가져와서 통계 정보를 표시
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { TestAttempt } from '@/models/test_attempts'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'

// Chart.js 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

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

    // 최고 점수와 최저 점수
    const scores = attempts.map(a => a.attempt_score || 0)
    const maxScore = Math.max(...scores)
    const minScore = Math.min(...scores)
    const bestAttempt = attempts.find(a => (a.attempt_score || 0) === maxScore)

    // 점수 분포 계산
    const scoreRanges = {
      '90-100': attempts.filter(a => (a.attempt_score || 0) >= 90).length,
      '80-89': attempts.filter(a => (a.attempt_score || 0) >= 80 && (a.attempt_score || 0) < 90).length,
      '70-79': attempts.filter(a => (a.attempt_score || 0) >= 70 && (a.attempt_score || 0) < 80).length,
      '60-69': attempts.filter(a => (a.attempt_score || 0) >= 60 && (a.attempt_score || 0) < 70).length,
      '0-59': attempts.filter(a => (a.attempt_score || 0) < 60).length,
    }

    // 시간대별 응시 분포
    const timeDistribution = attempts.reduce((acc, attempt) => {
      const hour = new Date(attempt.attempt_created_at).getHours()
      const timeSlot = hour < 6 ? '새벽(0-6시)' : 
                      hour < 12 ? '오전(6-12시)' : 
                      hour < 18 ? '오후(12-18시)' : '저녁(18-24시)'
      acc[timeSlot] = (acc[timeSlot] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // 최근 7일간의 응시 추이
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      return date.toISOString().split('T')[0]
    }).reverse()

    const dailyAttempts = last7Days.map(date => ({
      date: new Date(date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
      attempts: attempts.filter(a => a.attempt_created_at.startsWith(date)).length
    }))

    // 연속 학습 일수 계산
    const attemptDates = Array.from(new Set(attempts.map(a => a.attempt_created_at.split('T')[0]))).sort()
    let maxStreak = 0
    let currentStreak = 0
    let lastDate: string | null = null

    attemptDates.forEach(date => {
      if (lastDate) {
        const daysDiff = Math.floor((new Date(date).getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24))
        if (daysDiff === 1) {
          currentStreak++
        } else {
          currentStreak = 1
        }
      } else {
        currentStreak = 1
      }
      maxStreak = Math.max(maxStreak, currentStreak)
      lastDate = date
    })

    // 점수 추이 (최근 10개 응시)
    const recentScores = attempts.slice(0, 10).reverse().map((attempt, index) => ({
      attempt: index + 1,
      score: attempt.attempt_score || 0
    }))

    console.log('StatsStep - 통계 계산:', {
      totalAttempts,
      attemptsWithDuration: attemptsWithDuration.length,
      avgScore,
      avgDuration,
      maxScore,
      minScore,
      maxStreak
    })

    return {
      totalAttempts,
      avgScore: Math.round(avgScore),
      avgDurationSeconds: Math.round(avgDuration),
      avgDurationMinutes: Math.floor(avgDuration / 60),
      avgDurationRemainingSeconds: Math.round(avgDuration % 60),
      attemptsWithDuration: attemptsWithDuration.length,
      maxScore,
      minScore,
      bestAttempt,
      scoreRanges,
      timeDistribution,
      dailyAttempts,
      maxStreak,
      recentScores
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <div className="h-8 bg-gray-300 rounded animate-pulse mb-2" />
              <div className="text-sm text-gray-600">로딩 중...</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
          <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="text-red-500 bg-red-50 p-4 rounded-lg border border-red-200">
          <strong>오류:</strong> {error}
        </div>
      </div>
    )
  }

  const stats = calculateStats()

  if (!stats) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">📊</div>
        <h3 className="text-lg font-semibold text-gray-600 mb-2">응시 기록이 없습니다</h3>
        <p className="text-gray-500">퀴즈를 풀어보시면 통계를 확인할 수 있습니다!</p>
      </div>
    )
  }

  // 차트 데이터 설정
  const scoreDistributionData = {
    labels: Object.keys(stats.scoreRanges),
    datasets: [
      {
        data: Object.values(stats.scoreRanges),
        backgroundColor: [
          '#10B981', // 90-100: 녹색
          '#3B82F6', // 80-89: 파란색
          '#F59E0B', // 70-79: 노란색
          '#F97316', // 60-69: 주황색
          '#EF4444', // 0-59: 빨간색
        ],
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverBorderWidth: 3,
      },
    ],
  }

  const timeDistributionData = {
    labels: Object.keys(stats.timeDistribution),
    datasets: [
      {
        label: '응시 횟수',
        data: Object.values(stats.timeDistribution),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  }

  const dailyAttemptsData = {
    labels: stats.dailyAttempts.map(d => d.date),
    datasets: [
      {
        label: '응시 횟수',
        data: stats.dailyAttempts.map(d => d.attempts),
        borderColor: 'rgba(139, 92, 246, 1)',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgba(139, 92, 246, 1)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
      },
    ],
  }

  const scoreTrendData = {
    labels: stats.recentScores.map(s => `${s.attempt}회차`),
    datasets: [
      {
        label: '점수',
        data: stats.recentScores.map(s => s.score),
        borderColor: 'rgba(16, 185, 129, 1)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 3,
        fill: false,
        tension: 0.4,
        pointBackgroundColor: 'rgba(16, 185, 129, 1)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      },
    ],
  }

  // 차트 옵션
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
      },
    },
  }

  const lineChartOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  }

  return (
    <div className="h-full overflow-y-auto space-y-6">
      {/* 주요 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
          <div className="text-2xl font-bold text-green-600">{stats.avgScore}%</div>
          <div className="text-sm text-gray-600">평균 정답률</div>
        </div>
        
        <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
          <div className="text-2xl font-bold text-blue-600">
            {String(stats.avgDurationMinutes).padStart(2, '0')}:{String(stats.avgDurationRemainingSeconds).padStart(2, '0')}
          </div>
          <div className="text-sm text-gray-600">평균 소요시간</div>
        </div>
        
        <div className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border border-purple-200">
          <div className="text-2xl font-bold text-purple-600">{stats.totalAttempts}</div>
          <div className="text-sm text-gray-600">총 응시 횟수</div>
        </div>
        
        <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-200">
          <div className="text-2xl font-bold text-orange-600">{stats.maxScore}%</div>
          <div className="text-sm text-gray-600">최고 점수</div>
        </div>
      </div>

      {/* 추가 통계 카드 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="p-4 bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl border border-pink-200">
          <div className="text-2xl font-bold text-pink-600">{stats.maxStreak}일</div>
          <div className="text-sm text-gray-600">최장 연속 학습</div>
        </div>
        
        <div className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border border-indigo-200">
          <div className="text-2xl font-bold text-indigo-600">{stats.attemptsWithDuration}</div>
          <div className="text-sm text-gray-600">시간 기록 응시</div>
        </div>
        
        <div className="p-4 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border border-teal-200">
          <div className="text-2xl font-bold text-teal-600">{Math.round((stats.attemptsWithDuration / stats.totalAttempts) * 100)}%</div>
          <div className="text-sm text-gray-600">시간 기록 비율</div>
        </div>
      </div>

      {/* 차트 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 점수 분포 도넛 차트 */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
            점수 분포
          </h3>
          <div className="h-64">
            <Doughnut data={scoreDistributionData} options={chartOptions} />
          </div>
        </div>

        {/* 시간대별 응시 분포 바 차트 */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            시간대별 응시 분포
          </h3>
          <div className="h-64">
            <Bar data={timeDistributionData} options={lineChartOptions} />
          </div>
        </div>
      </div>

      {/* 라인 차트 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 최근 7일 응시 추이 */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
            최근 7일 응시 추이
          </h3>
          <div className="h-64">
            <Line data={dailyAttemptsData} options={lineChartOptions} />
          </div>
        </div>

        {/* 점수 추이 */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
            최근 점수 추이
          </h3>
          <div className="h-64">
            <Line data={scoreTrendData} options={lineChartOptions} />
          </div>
        </div>
      </div>

      {/* 최근 응시 기록 */}
      {attempts.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
            최근 응시 기록
          </h3>
          <div className="space-y-3">
            {attempts.slice(0, 5).map((attempt, index) => (
              <div key={attempt.attempt_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                    (attempt.attempt_score || 0) >= 80 ? 'bg-green-500' :
                    (attempt.attempt_score || 0) >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">
                      {attempt.attempt_score || 0}점
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(attempt.attempt_created_at).toLocaleDateString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">
                    {attempt.attempt_duration_sec && attempt.attempt_duration_sec > 0 
                      ? `${String(Math.floor(attempt.attempt_duration_sec / 60)).padStart(2, '0')}:${String(attempt.attempt_duration_sec % 60).padStart(2, '0')}` 
                      : '시간 기록 없음'}
                  </div>
                  <div className={`text-xs font-medium ${
                    (attempt.attempt_score || 0) >= 80 ? 'text-green-600' :
                    (attempt.attempt_score || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {(attempt.attempt_score || 0) >= 80 ? '우수' : 
                     (attempt.attempt_score || 0) >= 60 ? '양호' : '개선 필요'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 