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
  { id: 'definition', label: '개념 이해', description: '핵심 개념과 정의에 대한 이해', icon: '💡' },
  { id: 'mechanism', label: '원리 및 구조', description: '작동 원리와 시스템 구조 파악', icon: '⚙️' },
  { id: 'application', label: '예시 및 응용', description: '실제 적용 사례와 활용법', icon: '🔧' },
  { id: 'comparison', label: '비교 및 분류', description: '다양한 방법론과 접근법 비교', icon: '⚖️' },
  { id: 'problem_solving', label: '문제 해결', description: '실제 문제 상황에서의 해결 능력', icon: '🎯' }
]

const RESEARCH_CATEGORIES = [
  { id: 'motivation', label: '연구 동기', description: '연구의 배경과 필요성', icon: '🎯' },
  { id: 'related_work', label: '관련 연구', description: '기존 연구와의 차별점', icon: '📚' },
  { id: 'method', label: '방법론/기술', description: '제안된 방법과 기술적 세부사항', icon: '🔬' },
  { id: 'experiment', label: '실험 및 결과', description: '실험 설계와 성능 평가', icon: '🧪' },
  { id: 'limitation', label: '한계 및 향후 연구', description: '연구의 한계점과 개선 방향', icon: '⚠️' },
  { id: 'summary', label: '요약', description: '전체 연구의 핵심 내용', icon: '📝' },
  { id: 'critical_thinking', label: '비판적 사고', description: '연구의 타당성과 개선점 분석', icon: '🤔' }
]

// 퀴즈 유형 정의
const QUESTION_TYPES = [
  { id: 'multiple_choice', label: '객관식', description: '4지선다 객관식 문제', icon: '🔘' },
  { id: 'ox_quiz', label: 'OX 퀴즈', description: '참/거짓 판단 문제', icon: '✅' },
  { id: 'short_answer', label: '단답형', description: '핵심 키워드 답변', icon: '✏️' },
  { id: 'essay', label: '서술형', description: '상세한 설명 요구', icon: '📄' },
  { id: 'code_understanding', label: '코드 이해', description: '코드 분석 및 이해', icon: '💻' }
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl mx-auto max-h-[95vh] flex flex-col overflow-hidden border-4 border-white/20 animate-slideUp">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white p-8 flex-shrink-0 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
          <div className="relative flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold mb-2 drop-shadow-lg">AI 퀴즈 생성</h2>
              <p className="text-indigo-100 text-lg">학습 목적에 맞는 맞춤형 퀴즈를 생성해보세요 ✨</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-3xl transition-all duration-300 hover:scale-125 hover:rotate-90 bg-white/10 hover:bg-white/20 rounded-full w-12 h-12 flex items-center justify-center backdrop-blur-sm"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 컨텐츠 */}
        <div className="p-8 overflow-y-auto flex-1 bg-gradient-to-br from-gray-50 to-blue-50">
          <div className="space-y-8">
            {/* 1. 목적 선택 */}
            <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-3xl p-8 border-2 border-blue-200/50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02]">
              <label className="block text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="text-3xl mr-4 bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">🎯</span>
                학습 목적
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { value: 'learning', label: '일반 학습용', description: '학부생 수준의 개념 이해', icon: '📚', gradient: 'from-blue-500 via-cyan-500 to-teal-500' },
                  { value: 'research', label: '논문 학습용', description: '연구 논문 심화 분석', icon: '🔬', gradient: 'from-purple-500 via-pink-500 to-red-500' }
                ].map((purpose) => (
                  <button
                    key={purpose.value}
                    onClick={() => setOptions(prev => ({ ...prev, purpose: purpose.value as any }))}
                    className={`relative p-8 rounded-3xl border-2 transition-all duration-500 transform hover:scale-105 hover:rotate-1 ${
                      options.purpose === purpose.value
                        ? `border-transparent bg-gradient-to-r ${purpose.gradient} text-white shadow-2xl`
                        : 'border-gray-200 bg-white/80 hover:border-gray-300 hover:shadow-xl backdrop-blur-sm'
                    }`}
                  >
                    <div className="text-4xl mb-4 animate-bounce">{purpose.icon}</div>
                    <div className="font-bold text-xl mb-3">{purpose.label}</div>
                    <div className={`text-base ${options.purpose === purpose.value ? 'text-white/90' : 'text-gray-600'}`}>
                      {purpose.description}
                    </div>
                    {options.purpose === purpose.value && (
                      <div className="absolute top-4 right-4 w-8 h-8 bg-white/30 rounded-full flex items-center justify-center animate-pulse">
                        <div className="w-4 h-4 bg-white rounded-full"></div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. 카테고리 선택 */}
            <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-3xl p-8 border-2 border-green-200/50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02]">
              <label className="block text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="text-3xl mr-4 bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">📂</span>
                학습 카테고리
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-80 overflow-y-auto custom-scrollbar">
                {currentCategories.map((category) => (
                  <label key={category.id} className="group relative flex items-start space-x-4 p-6 rounded-2xl border-2 border-gray-200 hover:border-green-300 hover:bg-green-50/80 transition-all duration-300 cursor-pointer transform hover:scale-105 hover:rotate-1">
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
                      className="w-6 h-6 text-green-600 focus:ring-green-500 border-gray-300 rounded-lg mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className="text-2xl mr-3 group-hover:scale-125 transition-transform duration-300">{category.icon}</span>
                        <div className="font-semibold text-gray-800 text-lg">{category.label}</div>
                      </div>
                      <div className="text-sm text-gray-600">{category.description}</div>
                    </div>
                    {options.categories.includes(category.id) && (
                      <div className="absolute top-3 right-3 w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center animate-pulse">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* 3. 퀴즈 설정 */}
            <div className="bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 rounded-3xl p-8 border-2 border-yellow-200/50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02]">
              <label className="block text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="text-3xl mr-4 bg-gradient-to-r from-yellow-500 to-orange-600 bg-clip-text text-transparent">⚙️</span>
                퀴즈 설정
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 문제 개수 */}
                <div>
                  <label className="block text-lg font-semibold text-gray-700 mb-4">
                    문제 개수
                  </label>
                  <select
                    value={options.questionCount}
                    onChange={(e) => setOptions(prev => ({ 
                      ...prev, 
                      questionCount: parseInt(e.target.value) 
                    }))}
                    className="w-full p-5 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-yellow-500/30 focus:border-yellow-500 transition-all duration-300 bg-white/80 backdrop-blur-sm text-lg font-medium shadow-lg hover:shadow-xl"
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
                  <label className="block text-lg font-semibold text-gray-700 mb-4">
                    난이도
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { value: 'easy', label: '쉬움', color: 'from-green-400 via-emerald-400 to-teal-500', bgColor: 'bg-green-100/80', borderColor: 'border-green-300' },
                      { value: 'medium', label: '보통', color: 'from-yellow-400 via-orange-400 to-red-500', bgColor: 'bg-yellow-100/80', borderColor: 'border-yellow-300' },
                      { value: 'hard', label: '어려움', color: 'from-red-400 via-pink-400 to-purple-500', bgColor: 'bg-red-100/80', borderColor: 'border-red-300' }
                    ].map((level) => (
                      <button
                        key={level.value}
                        onClick={() => setOptions(prev => ({ ...prev, difficulty: level.value as any }))}
                        className={`p-4 rounded-2xl text-base font-semibold border-2 transition-all duration-300 transform hover:scale-110 hover:rotate-1 ${
                          options.difficulty === level.value
                            ? `bg-gradient-to-r ${level.color} text-white border-transparent shadow-2xl`
                            : `${level.bgColor} text-gray-700 ${level.borderColor} hover:shadow-xl backdrop-blur-sm`
                        }`}
                      >
                        {level.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 4. 퀴즈 유형 */}
            <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 rounded-3xl p-8 border-2 border-purple-200/50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02]">
              <label className="block text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="text-3xl mr-4 bg-gradient-to-r from-purple-500 to-pink-600 bg-clip-text text-transparent">🧩</span>
                퀴즈 유형
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {QUESTION_TYPES.map((type) => (
                  <label key={type.id} className="group relative flex items-start space-x-4 p-6 rounded-2xl border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50/80 transition-all duration-300 cursor-pointer transform hover:scale-105 hover:rotate-1">
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
                      className="w-6 h-6 text-purple-600 focus:ring-purple-500 border-gray-300 rounded-lg mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className="text-2xl mr-3 group-hover:scale-125 transition-transform duration-300">{type.icon}</span>
                        <div className="font-semibold text-gray-800 text-lg">{type.label}</div>
                      </div>
                      <div className="text-sm text-gray-600">{type.description}</div>
                    </div>
                    {options.questionTypes.includes(type.id) && (
                      <div className="absolute top-3 right-3 w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center animate-pulse">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* 5. 추가 설정 */}
            <div className="bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50 rounded-3xl p-8 border-2 border-gray-200/50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02]">
              <label className="block text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="text-3xl mr-4 bg-gradient-to-r from-gray-500 to-slate-600 bg-clip-text text-transparent">🔧</span>
                추가 설정
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 시간 제한 */}
                <div>
                  <label className="block text-lg font-semibold text-gray-700 mb-4">
                    시간 제한 (분)
                  </label>
                  <select
                    value={options.timeLimit}
                    onChange={(e) => setOptions(prev => ({ 
                      ...prev, 
                      timeLimit: parseInt(e.target.value) 
                    }))}
                    className="w-full p-5 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-gray-500/30 focus:border-gray-500 transition-all duration-300 bg-white/80 backdrop-blur-sm text-lg font-medium shadow-lg hover:shadow-xl"
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
                  <label className="block text-lg font-semibold text-gray-700 mb-4">
                    집중 페이지 (선택사항)
                  </label>
                  {loadingContents ? (
                    <div className="text-base text-gray-500 p-6 bg-white/80 rounded-2xl border-2 border-gray-200 backdrop-blur-sm">
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-500 mr-3"></div>
                        페이지 정보를 불러오는 중...
                      </div>
                    </div>
                  ) : paperContents.length > 0 ? (
                    <div className="max-h-48 overflow-y-auto border-2 border-gray-200 rounded-2xl p-4 bg-white/80 backdrop-blur-sm custom-scrollbar">
                      {paperContents.map((content) => (
                        <label key={content.content_id} className="flex items-center space-x-4 py-3 hover:bg-gray-50/80 rounded-xl px-3 transition-all duration-300 transform hover:scale-105">
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
                            className="w-5 h-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-lg"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-base font-semibold text-gray-700">
                              페이지 {content.content_index + 1}
                            </div>
                            <div className="text-sm text-gray-500 truncate">
                              {content.content_type} - {content.content_text.substring(0, 30)}...
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="text-base text-gray-500 p-6 bg-white/80 rounded-2xl border-2 border-gray-200 backdrop-blur-sm">
                      논문 내용을 불러올 수 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 버튼 영역 - 고정 위치 */}
        <div className="bg-gradient-to-r from-gray-50 via-slate-50 to-blue-50 px-8 py-8 border-t-2 border-gray-200/50 shadow-2xl flex-shrink-0">
          <div className="flex flex-col sm:flex-row gap-6">
            <button
              onClick={onClose}
              className="flex-1 px-10 py-5 border-2 border-gray-300 text-gray-700 rounded-2xl hover:bg-gray-100/80 transition-all duration-300 font-semibold transform hover:scale-105 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl text-lg"
            >
              취소
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating || options.categories.length === 0 || options.questionTypes.length === 0}
              className="flex-1 px-10 py-5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-2xl hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 disabled:from-gray-300 disabled:via-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 font-semibold transform hover:scale-105 disabled:transform-none shadow-2xl hover:shadow-3xl min-h-[70px] flex items-center justify-center text-xl backdrop-blur-sm"
            >
              {generating ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mr-4"></div>
                  <span className="text-xl font-bold">생성 중...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <span className="text-2xl font-bold">🚀 퀴즈 생성하기</span>
                </div>
              )}
            </button>
          </div>
          
          {/* 에러 메시지들 */}
          <div className="mt-6 space-y-3">
            {options.questionTypes.length === 0 && (
              <div className="p-6 bg-red-50/80 border-2 border-red-200 rounded-2xl backdrop-blur-sm animate-pulse">
                <div className="flex items-center justify-center text-red-600 font-bold text-lg">
                  <span className="text-2xl mr-4">⚠️</span>
                  퀴즈 유형을 하나 이상 선택해주세요.
                </div>
              </div>
            )}
            
            {options.categories.length === 0 && (
              <div className="p-6 bg-red-50/80 border-2 border-red-200 rounded-2xl backdrop-blur-sm animate-pulse">
                <div className="flex items-center justify-center text-red-600 font-bold text-lg">
                  <span className="text-2xl mr-4">⚠️</span>
                  학습 카테고리를 하나 이상 선택해주세요.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 