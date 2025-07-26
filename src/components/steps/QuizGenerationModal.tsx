// AI 퀴즈 생성 모달 컴포넌트
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface QuizGenerationModalProps {
  isOpen: boolean
  onClose: () => void
  onGenerate: (options: QuizGenerationOptions) => void
  paperId: string
}

export interface QuizGenerationOptions {
  questionCount: number
  difficulty: 'easy' | 'medium' | 'hard'
  questionTypes: {
    multipleChoice: boolean
    shortAnswer: boolean
    essay: boolean
  }
  timeLimit?: number // 분 단위
  focusPages?: number[] // content_index 기반 페이지 선택
}

interface PaperContent {
  content_id: number
  content_index: number
  content_type: string
  content_text: string
}

export default function QuizGenerationModal({ 
  isOpen, 
  onClose, 
  onGenerate, 
  paperId 
}: QuizGenerationModalProps) {
  const [options, setOptions] = useState<QuizGenerationOptions>({
    questionCount: 5,
    difficulty: 'medium',
    questionTypes: {
      multipleChoice: true,
      shortAnswer: false,
      essay: false
    },
    timeLimit: 30,
    focusPages: []
  })

  const [generating, setGenerating] = useState(false)
  const [paperContents, setPaperContents] = useState<PaperContent[]>([])
  const [loadingContents, setLoadingContents] = useState(false)

  // 논문 내용 로드
  useEffect(() => {
    if (isOpen && paperId) {
      loadPaperContents()
    }
  }, [isOpen, paperId])

  const loadPaperContents = async () => {
    try {
      setLoadingContents(true)
      const { data, error } = await supabase
        .from('paper_contents')
        .select('content_id, content_index, content_type, content_text')
        .eq('content_paper_id', paperId)
        .order('content_index', { ascending: true })

      if (error) {
        console.error('논문 내용 로드 오류:', error)
      } else {
        setPaperContents(data || [])
      }
    } catch (err) {
      console.error('논문 내용 로드 오류:', err)
    } finally {
      setLoadingContents(false)
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      await onGenerate(options)
      onClose()
    } catch (error) {
      console.error('퀴즈 생성 오류:', error)
    } finally {
      setGenerating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">AI 퀴즈 생성</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* 문제 개수 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              문제 개수
            </label>
            <select
              value={options.questionCount}
              onChange={(e) => setOptions(prev => ({ 
                ...prev, 
                questionCount: parseInt(e.target.value) 
              }))}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={3}>3문제</option>
              <option value={5}>5문제</option>
              <option value={10}>10문제</option>
              <option value={15}>15문제</option>
              <option value={20}>20문제</option>
            </select>
          </div>

          {/* 난이도 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              난이도
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'easy', label: '쉬움', color: 'bg-green-100 text-green-800' },
                { value: 'medium', label: '보통', color: 'bg-yellow-100 text-yellow-800' },
                { value: 'hard', label: '어려움', color: 'bg-red-100 text-red-800' }
              ].map((level) => (
                <button
                  key={level.value}
                  onClick={() => setOptions(prev => ({ ...prev, difficulty: level.value as any }))}
                  className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                    options.difficulty === level.value
                      ? level.color
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          {/* 문제 유형 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              문제 유형
            </label>
            <div className="space-y-2">
              {[
                { key: 'multipleChoice', label: '객관식', description: '4지선다 객관식 문제' },
                { key: 'shortAnswer', label: '단답형', description: '짧은 답변 문제' },
                { key: 'essay', label: '서술형', description: '긴 답변 서술형 문제' }
              ].map((type) => (
                <label key={type.key} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={options.questionTypes[type.key as keyof typeof options.questionTypes]}
                    onChange={(e) => setOptions(prev => ({
                      ...prev,
                      questionTypes: {
                        ...prev.questionTypes,
                        [type.key]: e.target.checked
                      }
                    }))}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-700">{type.label}</div>
                    <div className="text-xs text-gray-500">{type.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 시간 제한 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              시간 제한 (분)
            </label>
            <select
              value={options.timeLimit}
              onChange={(e) => setOptions(prev => ({ 
                ...prev, 
                timeLimit: parseInt(e.target.value) 
              }))}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={10}>10분</option>
              <option value={15}>15분</option>
              <option value={20}>20분</option>
              <option value={30}>30분</option>
              <option value={45}>45분</option>
              <option value={60}>60분</option>
              <option value={0}>제한 없음</option>
            </select>
          </div>

          {/* 집중 페이지 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              집중 페이지 (선택사항)
            </label>
            {loadingContents ? (
              <div className="text-sm text-gray-500">페이지 정보를 불러오는 중...</div>
            ) : paperContents.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {paperContents.map((content) => (
                  <label key={content.content_id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={options.focusPages?.includes(content.content_index)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setOptions(prev => ({
                            ...prev,
                            focusPages: [...(prev.focusPages || []), content.content_index]
                          }))
                        } else {
                          setOptions(prev => ({
                            ...prev,
                            focusPages: prev.focusPages?.filter(page => page !== content.content_index) || []
                          }))
                        }
                      }}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-700">
                        페이지 {content.content_index + 1}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {content.content_type} - {content.content_text.substring(0, 50)}...
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500">논문 내용을 불러올 수 없습니다.</div>
            )}
            {paperContents.length > 0 && (
              <div className="mt-2 text-xs text-gray-500">
                선택하지 않으면 전체 페이지에서 퀴즈가 생성됩니다.
              </div>
            )}
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex space-x-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating || !Object.values(options.questionTypes).some(Boolean)}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {generating ? '생성 중...' : '퀴즈 생성하기'}
          </button>
        </div>
      </div>
    </div>
  )
} 