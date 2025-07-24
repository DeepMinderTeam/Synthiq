'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import PdfUploadModal from '@/components/PdfUploadModal'
import { ExclamationTriangleIcon, CheckCircleIcon, PlusIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/hooks/useAuth'

// ✅ recharts 라이브러리 import
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
  LineChart, Line
} from 'recharts'

// ✅ 막대그래프: 월별 학습 시간(시간 단위)
const barData = [
  { month: '3월', hours: 12 },
  { month: '4월', hours: 18 },
  { month: '5월', hours: 26 },
  { month: '6월', hours: 30 },
  { month: '7월', hours: 42 },
]

// ✅ 원형그래프: 퀴즈 정답률 분포
const pieData = [
  { name: '정답', value: 70 },
  { name: '오답', value: 20 },
  { name: '부분정답', value: 10 },
]
const COLORS = ['#00C49F', '#FF8042', '#FFBB28']

// ✅ 선형그래프: 주차별 학습 진도율(%)
const lineData = [
  { week: '1주차', progress: 10 },
  { week: '2주차', progress: 25 },
  { week: '3주차', progress: 45 },
  { week: '4주차', progress: 60 },
  { week: '5주차', progress: 80 },
  { week: '6주차', progress: 95 },
]

// ✅ 논문 리스트
const papers = [
  { id: 1, title: '강아지에 관한 연구', date: '2025.06.05', summary: '강아지 관련 요약 내용입니다.' },
  { id: 2, title: '집단 간 네트워크 분석', date: '2025.06.10', summary: '네트워크 분석 관련 요약 내용입니다.' },
  { id: 3, title: 'AI 기반 분석', date: '2025.07.01', summary: '포유류 AI 분석 관련 요약 내용입니다.' },
]

export default function TopicPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading } = useAuth()
  const topicId = params.topicId as string
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // 인증 상태 확인
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!user) {
    return null // 리다이렉트 중
  }

  const handleUploadSuccess = (filePath: string, originalFileName: string) => {
    setMessage({
      type: 'success',
      text: `"${originalFileName}" 파일이 성공적으로 업로드되었습니다!`
    })
    setTimeout(() => {
      setMessage(null)
    }, 3000)
  }

  const handleUploadError = (error: string) => {
    setMessage({
      type: 'error',
      text: error
    })
    setTimeout(() => {
      setMessage(null)
    }, 5000)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-6">

          {/* 헤더 */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                주제 관리
              </h1>
              <p className="text-gray-600">
                주제 ID: {topicId}의 논문들을 관리하세요.
              </p>
            </div>
            {/* ✅ 논문 추가 버튼 */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              논문 추가하기
            </button>
          </div>

          {/* 메시지 표시 */}
          {message && (
            <div
              className={`mb-6 p-4 rounded-md flex items-center space-x-3 ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircleIcon className="h-5 w-5 text-green-400" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              )}
              <p
                className={`text-sm font-medium ${
                  message.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}
              >
                {message.text}
              </p>
            </div>
          )}

          {/* 📊 그래프 영역 */}
          {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-100 rounded-lg mb-8"> */}
            {/* ✅ 막대그래프: 월별 학습 시간 */}
            {/* <div className="bg-white p-4 rounded shadow flex flex-col items-center">
              <h2 className="font-bold mb-2">월별 학습 시간</h2>
              <BarChart width={300} height={200} data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="hours" fill="#8884d8" />
              </BarChart> */}
              {/* 📝 주석 */}
              {/* <p className="text-xs text-gray-500 mt-2">
                최근 5개월간 학습한 시간을 막대그래프로 표시합니다.
              </p>
            </div> */}

            {/* ✅ 원형그래프: 퀴즈 정답률 */}
            {/* <div className="bg-white p-4 rounded shadow flex flex-col items-center">
              <h2 className="font-bold mb-2">퀴즈 정답률</h2>
              <PieChart width={300} height={200}>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart> */}
              {/* 📝 주석 */}
              {/* <p className="text-xs text-gray-500 mt-2">
                퀴즈 정답, 오답, 부분정답 비율을 한눈에 볼 수 있습니다.
              </p>
            </div> */}

            {/* ✅ 선형그래프: 주차별 학습 진도율 */}
            {/* <div className="bg-white p-4 rounded shadow flex flex-col items-center">
              <h2 className="font-bold mb-2">주차별 학습 진도율</h2>
              <LineChart width={300} height={200} data={lineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="progress" stroke="#82ca9d" />
              </LineChart> */}
              {/* 📝 주석 */}
              {/* <p className="text-xs text-gray-500 mt-2">
                주차별 학습 진행 상황을 선 그래프로 표시합니다.
              </p>
            </div>
          </div> */}

          {/* PDF 업로드 모달 */}
          <PdfUploadModal
            topicId={topicId}
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onUploadSuccess={handleUploadSuccess}
            onUploadError={handleUploadError}
          />

          {/* 📑 업로드된 논문 목록 */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              업로드된 논문 목록
            </h2>
            {papers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {papers.map((paper) => (
                  <div key={paper.id} className="bg-white rounded shadow p-4">
                    <div className="font-bold mb-2">{paper.title}</div>
                    <div className="text-sm text-gray-600 mb-2">{paper.summary}</div>
                    <div className="text-xs text-gray-400">
                      마지막으로 열어본 날짜 {paper.date}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                아직 업로드된 논문이 없습니다.
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
