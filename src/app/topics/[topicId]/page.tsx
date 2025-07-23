'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import PdfUploadModal from '@/components/PdfUploadModal'
import { ExclamationTriangleIcon, CheckCircleIcon, PlusIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/hooks/useAuth'

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

  // 로딩 중이거나 인증되지 않은 경우
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
    
    // 3초 후 메시지 제거
    setTimeout(() => {
      setMessage(null)
    }, 3000)
  }

  const handleUploadError = (error: string) => {
    setMessage({
      type: 'error',
      text: error
    })
    
    // 5초 후 메시지 제거
    setTimeout(() => {
      setMessage(null)
    }, 5000)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              주제 관리
            </h1>
            <p className="text-gray-600">
              주제 ID: {topicId}의 논문들을 관리하세요.
            </p>
          </div>

          {/* 메시지 표시 */}
          {message && (
            <div className={`mb-6 p-4 rounded-md flex items-center space-x-3 ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              {message.type === 'success' ? (
                <CheckCircleIcon className="h-5 w-5 text-green-400" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              )}
              <p className={`text-sm font-medium ${
                message.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {message.text}
              </p>
            </div>
          )}

          {/* 논문 추가 버튼 */}
          <div className="text-center">
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              논문 추가하기
            </button>
          </div>

          {/* PDF 업로드 모달 */}
          <PdfUploadModal
            topicId={topicId}
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onUploadSuccess={handleUploadSuccess}
            onUploadError={handleUploadError}
          />

          {/* 업로드된 파일 목록 (향후 구현) */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              업로드된 논문 목록
            </h2>
            <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
              아직 업로드된 논문이 없습니다.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}