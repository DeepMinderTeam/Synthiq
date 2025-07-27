'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { CloudArrowUpIcon, DocumentArrowUpIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/hooks/useAuth'

interface PdfUploadModalProps {
  topicId: string
  isOpen: boolean
  onClose: () => void
  onUploadSuccess?: (filePath: string, originalFileName: string) => void
  onUploadError?: (error: string) => void
}

export default function PdfUploadModal({ 
  topicId, 
  isOpen, 
  onClose, 
  onUploadSuccess, 
  onUploadError 
}: PdfUploadModalProps) {
  const { user } = useAuth()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const [description, setDescription] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 안전한 파일명 생성 함수
  const generateSafeFileName = (originalName: string): string => {
    // 파일 확장자 추출
    const lastDotIndex = originalName.lastIndexOf('.')
    const extension = lastDotIndex > 0 ? originalName.slice(lastDotIndex).toLowerCase() : '.pdf'
    const nameWithoutExt = lastDotIndex > 0 ? originalName.slice(0, lastDotIndex) : originalName
    
    // 안전한 파일명 생성 (더 엄격한 규칙)
    const safeName = nameWithoutExt
      .replace(/[^a-zA-Z0-9]/g, '_') // 영문, 숫자만 허용 (한글 제거)
      .replace(/_{2,}/g, '_') // 연속된 언더스코어를 하나로
      .replace(/^_|_$/g, '') // 앞뒤 언더스코어 제거
      .toLowerCase() // 소문자로 변환
      .substring(0, 50) // 최대 50자로 제한
    
    // 파일명이 비어있으면 기본값 사용
    const finalName = safeName || 'document'
    
    return `${finalName}${extension}`
  }

  const handleFileUpload = async () => {
    if (!selectedFile) return

    // 인증 상태 확인
    if (!user) {
      onUploadError?.('로그인이 필요합니다.')
      return
    }

    // PDF 파일 검증
    if (selectedFile.type !== 'application/pdf') {
      onUploadError?.('PDF 파일만 업로드 가능합니다.')
      return
    }

    // 파일 크기 검증 (10MB 제한)
    if (selectedFile.size > 10 * 1024 * 1024) {
      onUploadError?.('파일 크기는 10MB 이하여야 합니다.')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // 현재 세션 확인
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('인증 세션이 없습니다.')
      }

      console.log('현재 사용자:', session.user.email)
      console.log('사용자 ID:', session.user.id)
      console.log('원본 파일명:', selectedFile.name)
      console.log('파일 크기:', selectedFile.size)
      console.log('파일 타입:', selectedFile.type)

      // 사용자가 해당 주제의 소유자인지 확인
      const { data: topicData, error: topicError } = await supabase
        .from('topics')
        .select('topic_id, topic_user_id')
        .eq('topic_id', topicId)
        .single()

      if (topicError) {
        console.error('주제 조회 오류:', topicError)
        throw new Error('주제 정보를 찾을 수 없습니다.')
      }

      console.log('주제 정보:', topicData)
      console.log('주제 소유자 ID:', topicData.topic_user_id)
      console.log('현재 사용자 ID:', session.user.id)

      if (topicData.topic_user_id !== session.user.id) {
        throw new Error('이 주제에 논문을 추가할 권한이 없습니다.')
      }

      // 안전한 파일명 생성
      const timestamp = Date.now()
      const safeFileName = generateSafeFileName(selectedFile.name)
      const fileName = `${timestamp}_${safeFileName}`
      const filePath = `${topicId}/${fileName}`

      console.log('안전한 파일명:', safeFileName)
      console.log('최종 파일명:', fileName)
      console.log('업로드 경로:', filePath)

      // Supabase Storage에 업로드
      const { data, error } = await supabase.storage
        .from('papers')
        .upload(filePath, selectedFile)

      if (error) {
        console.error('Storage 업로드 오류:', error)
        console.error('오류 메시지:', error.message)
        throw error
      }

      console.log('Storage 업로드 성공:', data)

      // paper 테이블에 레코드 생성
      const { data: paperData, error: paperError } = await supabase
        .from('paper')
        .insert({
          paper_topic_id: parseInt(topicId),
          paper_title: selectedFile.name.replace('.pdf', ''),
          paper_abstract: description || null, // 설명 저장
          paper_url: filePath, // Storage 경로 저장
          paper_created_at: new Date().toISOString()
        })
        .select()

      if (paperError) {
        console.error('Paper 테이블 생성 오류:', paperError)
        throw new Error('논문 정보 저장에 실패했습니다.')
      }

      console.log('논문 저장 성공:', paperData)

      // 업로드 성공 시 콜백 호출
      onUploadSuccess?.(filePath, selectedFile.name)
      setUploadProgress(100)
      
      // 모달 닫기 및 초기화
      setTimeout(() => {
        handleClose()
      }, 1000)

    } catch (error) {
      console.error('PDF 업로드 오류:', error)
      onUploadError?.(error instanceof Error ? error.message : '업로드 중 오류가 발생했습니다.')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleClose = () => {
    setSelectedFile(null)
    setDescription('')
    setDragActive(false)
    setUploadProgress(0)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">논문 업로드</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isUploading}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* 내용 */}
        <div className="p-6 space-y-6">
          {/* 파일 업로드 영역 */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />

            <div className="space-y-4">
              {isUploading ? (
                <div className="space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-sm text-gray-600">업로드 중...</p>
                  {uploadProgress > 0 && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              ) : selectedFile ? (
                <div className="space-y-2">
                  <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-green-500" />
                  <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    파일 제거
                  </button>
                </div>
              ) : (
                <>
                  <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-blue-600 hover:text-blue-500 cursor-pointer" onClick={handleButtonClick}>
                        클릭하여 파일 선택
                      </span>
                      {' '}또는 드래그 앤 드롭
                    </p>
                    <p className="text-xs text-gray-500">PDF 파일만 지원 (최대 10MB)</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 설명 입력 */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              논문 설명 (선택사항)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="논문에 대한 간단한 설명을 입력하세요..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={4}
              disabled={isUploading}
            />
          </div>

          {/* 업로드 버튼 */}
          {selectedFile && !isUploading && (
            <button
              onClick={handleFileUpload}
              className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <DocumentArrowUpIcon className="h-5 w-5 mr-2" />
              논문 업로드
            </button>
          )}

          {/* 파일 선택 버튼 */}
          {!selectedFile && !isUploading && (
            <button
              onClick={handleButtonClick}
              className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <DocumentArrowUpIcon className="h-5 w-5 mr-2" />
              PDF 파일 선택
            </button>
          )}
        </div>
      </div>
    </div>
  )
} 