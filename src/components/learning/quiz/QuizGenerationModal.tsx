// AI 퀴즈 생성 모달 컴포넌트
'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface QuizGenerationModalProps {
  isOpen: boolean
  onClose: () => void
  onGenerate: (options: QuizGenerationOptions) => void
  paperId: string
}

export interface QuizGenerationOptions {
  // 목적별 카테고리
  purpose: 'learning' | 'research' // 일반 학습용 | 논문 학습용
  categories: string[] // 선택된 카테고리들
  
  // 퀴즈 설정
  questionCount: number
  difficulty: 'easy' | 'medium' | 'hard'
  questionTypes: string[] // 선택된 퀴즈 유형들
  
  // 추가 설정
  timeLimit?: number
  focusPages?: number[]
}

interface PaperContent {
  content_id: number
  content_index: number
  content_type: string
  content_text: string
}

// 목적별 카테고리 정의
const LEARNING_CATEGORIES = [
  { id: 'definition', label: '개념 이해', description: '핵심 개념과 정의에 대한 이해' },
  { id: 'mechanism', label: '원리 및 구조', description: '작동 원리와 시스템 구조 파악' },
  { id: 'application', label: '예시 및 응용', description: '실제 적용 사례와 활용법' },
  { id: 'comparison', label: '비교 및 분류', description: '다양한 방법론과 접근법 비교' },
  { id: 'problem_solving', label: '문제 해결', description: '실제 문제 상황에서의 해결 능력' }
]

const RESEARCH_CATEGORIES = [
  { id: 'motivation', label: '연구 동기', description: '연구의 배경과 필요성' },
  { id: 'related_work', label: '관련 연구', description: '기존 연구와의 차별점' },
  { id: 'method', label: '방법론/기술', description: '제안된 방법과 기술적 세부사항' },
  { id: 'experiment', label: '실험 및 결과', description: '실험 설계와 성능 평가' },
  { id: 'limitation', label: '한계 및 향후 연구', description: '연구의 한계점과 개선 방향' },
  { id: 'summary', label: '요약', description: '전체 연구의 핵심 내용' },
  { id: 'critical_thinking', label: '비판적 사고', description: '연구의 타당성과 개선점 분석' }
]

// 퀴즈 유형 정의
const QUESTION_TYPES = [
  { id: 'multiple_choice', label: '객관식', description: '4지선다 객관식 문제' },
  { id: 'ox_quiz', label: 'OX 퀴즈', description: '참/거짓 판단 문제' },
  { id: 'short_answer', label: '단답형', description: '핵심 키워드 답변' },
  { id: 'essay', label: '서술형', description: '상세한 설명 요구' },
  { id: 'code_understanding', label: '코드 이해', description: '코드 분석 및 이해' }
]

export default function QuizGenerationModal({ 
  isOpen, 
  onClose, 
  onGenerate, 
  paperId 
}: QuizGenerationModalProps) {
  const [options, setOptions] = useState<QuizGenerationOptions>({
    purpose: 'learning',
    categories: ['definition'],
    questionCount: 5,
    difficulty: 'medium',
    questionTypes: [], // 빈 배열로 시작하여 사용자가 선택하도록 함
    timeLimit: 30,
    focusPages: []
  })

  const [generating, setGenerating] = useState(false)
  const [paperContents, setPaperContents] = useState<PaperContent[]>([])
  const [loadingContents, setLoadingContents] = useState(false)

  const loadPaperContents = useCallback(async () => {
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
  }, [paperId])

  // 논문 내용 로드
  useEffect(() => {
    if (isOpen && paperId) {
      loadPaperContents()
    }
  }, [isOpen, paperId, loadPaperContents])

  // 목적 변경 시 카테고리 초기화
  useEffect(() => {
    if (options.purpose === 'learning') {
      setOptions(prev => ({ ...prev, categories: ['definition'] }))
    } else {
      setOptions(prev => ({ ...prev, categories: ['motivation'] }))
    }
  }, [options.purpose])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      // 선택된 퀴즈 유형만 필터링하여 전송
      const filteredOptions = {
        ...options,
        questionTypes: options.questionTypes.filter(type => type !== '') // 빈 값 제거
      }
      
      console.log('퀴즈 생성 요청:', { paperId, options: filteredOptions })
      await onGenerate(filteredOptions)
      onClose()
    } catch (error) {
      console.error('퀴즈 생성 오류:', error)
    } finally {
      setGenerating(false)
    }
  }

  const currentCategories = options.purpose === 'learning' ? LEARNING_CATEGORIES : RESEARCH_CATEGORIES

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">AI 퀴즈 생성</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* 1. 목적 선택 */}
          <div>
            <label className="block text-lg font-semibold text-gray-800 mb-3">
              🎯 학습 목적
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'learning', label: '일반 학습용', description: '학부생 수준의 개념 이해', icon: '📚' },
                { value: 'research', label: '논문 학습용', description: '연구 논문 심화 분석', icon: '🔬' }
              ].map((purpose) => (
                <button
                  key={purpose.value}
                  onClick={() => setOptions(prev => ({ ...prev, purpose: purpose.value as any }))}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    options.purpose === purpose.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-2">{purpose.icon}</div>
                  <div className="font-semibold text-gray-800">{purpose.label}</div>
                  <div className="text-sm text-gray-600">{purpose.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. 카테고리 선택 */}
          <div>
            <label className="block text-lg font-semibold text-gray-800 mb-3">
              📂 학습 카테고리
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {currentCategories.map((category) => (
                <label key={category.id} className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={options.categories.includes(category.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setOptions(prev => ({
                          ...prev,
                          categories: [...prev.categories, category.id]
                        }))
                      } else {
                        setOptions(prev => ({
                          ...prev,
                          categories: prev.categories.filter(c => c !== category.id)
                        }))
                      }
                    }}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                  />
                  <div>
                    <div className="font-medium text-gray-800">{category.label}</div>
                    <div className="text-sm text-gray-500">{category.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 3. 퀴즈 설정 */}
          <div className="grid grid-cols-2 gap-6">
            {/* 문제 개수 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                문제 개수
              </label>
              <select
                value={options.questionCount}
                onChange={(e) => setOptions(prev => ({ 
                  ...prev, 
                  questionCount: parseInt(e.target.value) 
                }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                난이도
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'easy', label: '쉬움', color: 'bg-green-100 text-green-800 border-green-300' },
                  { value: 'medium', label: '보통', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
                  { value: 'hard', label: '어려움', color: 'bg-red-100 text-red-800 border-red-300' }
                ].map((level) => (
                  <button
                    key={level.value}
                    onClick={() => setOptions(prev => ({ ...prev, difficulty: level.value as any }))}
                    className={`p-2 rounded-lg text-sm font-medium border transition-colors ${
                      options.difficulty === level.value
                        ? level.color
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-300'
                    }`}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4. 퀴즈 유형 */}
          <div>
            <label className="block text-lg font-semibold text-gray-800 mb-3">
              🧩 퀴즈 유형
            </label>
            <div className="grid grid-cols-2 gap-3">
              {QUESTION_TYPES.map((type) => (
                <label key={type.id} className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={options.questionTypes.includes(type.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setOptions(prev => ({
                          ...prev,
                          questionTypes: [...prev.questionTypes, type.id]
                        }))
                      } else {
                        setOptions(prev => ({
                          ...prev,
                          questionTypes: prev.questionTypes.filter(t => t !== type.id)
                        }))
                      }
                    }}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                  />
                  <div>
                    <div className="font-medium text-gray-800">{type.label}</div>
                    <div className="text-sm text-gray-500">{type.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 5. 추가 설정 */}
          <div className="grid grid-cols-2 gap-6">
            {/* 시간 제한 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                시간 제한 (분)
              </label>
              <select
                value={options.timeLimit}
                onChange={(e) => setOptions(prev => ({ 
                  ...prev, 
                  timeLimit: parseInt(e.target.value) 
                }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                집중 페이지 (선택사항)
              </label>
              {loadingContents ? (
                <div className="text-sm text-gray-500 p-3">페이지 정보를 불러오는 중...</div>
              ) : paperContents.length > 0 ? (
                <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2">
                  {paperContents.map((content) => (
                    <label key={content.content_id} className="flex items-center space-x-2 py-1">
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
                          {content.content_type} - {content.content_text.substring(0, 30)}...
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 p-3">논문 내용을 불러올 수 없습니다.</div>
              )}
            </div>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex space-x-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            취소
          </button>
                                <button
                        onClick={handleGenerate}
                        disabled={generating || options.categories.length === 0 || options.questionTypes.length === 0}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all font-medium"
                      >
                        {generating ? '생성 중...' : '퀴즈 생성하기'}
                      </button>
                      {options.questionTypes.length === 0 && (
                        <div className="text-sm text-red-500 mt-2 text-center">
                          퀴즈 유형을 하나 이상 선택해주세요.
                        </div>
                      )}
        </div>
      </div>
    </div>
  )
} 