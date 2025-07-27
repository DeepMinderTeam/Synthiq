// 논문 학습 단계별 내용을 통합 관리하는 컴포넌트
// 현재 단계에 따라 적절한 컴포넌트(읽기/요약/퀴즈/통계)를 렌더링
import { type LearningStep } from '@/hooks/paperStore'
import { useState } from 'react'
import ReadingStep from './ReadingStep'
import SummaryStep from './SummaryStep'
import QuizStep from './QuizStep'
import StatsStep from './StatsStep'
import QuizGenerationModal from './QuizGenerationModal'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface StepContentProps {
  currentStep: LearningStep
  paperId: string
  isPaperContentCollapsed?: boolean
  onTogglePaperContent?: () => void
}

export default function StepContent({ currentStep, paperId, isPaperContentCollapsed, onTogglePaperContent }: StepContentProps) {
  const [activeTab, setActiveTab] = useState<'ai' | 'self'>('ai')
  const [generatingQuiz, setGeneratingQuiz] = useState(false)
  const [showQuizModal, setShowQuizModal] = useState(false)
  const [generatingSummary, setGeneratingSummary] = useState(false)

  const getStepTitle = () => {
    switch (currentStep) {
      case 'reading':
        return '논문 읽기'
      case 'summary':
        return '논문 요약'
      case 'quiz':
        return '논문 퀴즈'
      case 'stats':
        return '논문 통계'
      default:
        return ''
    }
  }

  const handleGenerateQuiz = async (options: any) => {
    try {
      setGeneratingQuiz(true)
      console.log('퀴즈 생성 요청 시작:', { paperId, options })
      
      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          paperId, 
          options: {
            questionCount: options.questionCount,
            difficulty: options.difficulty,
            questionTypes: options.questionTypes,
            timeLimit: options.timeLimit,
            focusPages: options.focusPages
          }
        }),
      })

      const result = await response.json()
      console.log('퀴즈 생성 응답:', { status: response.status, result })

      if (!response.ok) {
        throw new Error(result.error || '퀴즈 생성에 실패했습니다.')
      }

      // 성공 메시지 표시
      alert(`퀴즈 생성 완료! ${result.quizCount}개의 퀴즈가 생성되었습니다.`)
      
    } catch (err) {
      console.error('퀴즈 생성 오류:', err)
      const errorMessage = err instanceof Error ? err.message : '퀴즈 생성 중 오류가 발생했습니다.'
      alert(`퀴즈 생성 실패: ${errorMessage}`)
    } finally {
      setGeneratingQuiz(false)
    }
  }

  const handleGenerateAISummary = async () => {
    try {
      setGeneratingSummary(true)
      console.log('AI 요약 생성 요청 시작:', { paperId })
      
      const response = await fetch('/api/classify-and-summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paperId }),
      })

      const result = await response.json()
      console.log('AI 요약 생성 응답:', { status: response.status, result })

      if (!response.ok) {
        throw new Error(result.error || 'AI 요약 생성에 실패했습니다.')
      }

      // 성공 메시지 표시
      alert('AI 정리노트 생성 완료!')
      
    } catch (err) {
      console.error('AI 요약 생성 오류:', err)
      const errorMessage = err instanceof Error ? err.message : 'AI 요약 생성 중 오류가 발생했습니다.'
      alert(`AI 요약 생성 실패: ${errorMessage}`)
    } finally {
      setGeneratingSummary(false)
    }
  }

  const renderHeader = () => {
    const toggleButton = onTogglePaperContent && (
      <button
        onClick={onTogglePaperContent}
        className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-colors"
        title={isPaperContentCollapsed ? "논문 내용 펼치기" : "논문 내용 접기"}
      >
        {isPaperContentCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    )

    switch (currentStep) {
      case 'summary':
        return (
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              {toggleButton}
              <h3 className="text-lg font-semibold text-gray-800">{getStepTitle()}</h3>
            </div>
            <div className="flex items-center space-x-3">
              {activeTab === 'ai' && (
                <button
                  onClick={handleGenerateAISummary}
                  disabled={generatingSummary}
                  className="text-xs font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600 px-2 py-1 rounded disabled:bg-gray-300 disabled:cursor-not-allowed hover:from-blue-600 hover:to-purple-700 transition-colors"
                >
                  {generatingSummary ? '생성 중...' : '✨ AI 정리노트 생성'}
                </button>
              )}
              <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setActiveTab('ai')}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeTab === 'ai'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  🤖 AI_전체정리노트
                </button>
                <button
                  onClick={() => setActiveTab('self')}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeTab === 'self'
                      ? 'bg-green-500 text-white'
                      : 'bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  ✏️ 나의정리노트
                </button>
              </div>
            </div>
          </div>
        )
      case 'quiz':
        return (
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              {toggleButton}
              <h3 className="text-lg font-semibold text-gray-800">{getStepTitle()}</h3>
            </div>
            <button
              onClick={() => setShowQuizModal(true)}
              disabled={generatingQuiz}
              className="text-xs font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600 px-2 py-1 rounded disabled:bg-gray-300 disabled:cursor-not-allowed hover:from-blue-600 hover:to-purple-700 transition-colors"
            >
              {generatingQuiz ? '생성 중...' : '✨ AI 퀴즈 생성'}
            </button>
          </div>
        )
      case 'stats':
        return (
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              {toggleButton}
              <h3 className="text-lg font-semibold text-gray-800">{getStepTitle()}</h3>
            </div>
          </div>
        )
      default:
        return (
          <div className="flex items-center space-x-3">
            {toggleButton}
            <h3 className="text-lg font-semibold text-gray-800">{getStepTitle()}</h3>
          </div>
        )
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm w-full h-full flex flex-col">
      <div className="p-4 sm:p-6 border-b border-gray-100">
        {renderHeader()}
      </div>
      <div className="flex-1 p-4 sm:p-6 overflow-hidden">
        {currentStep === 'reading' && <ReadingStep paperId={paperId} />}
        {currentStep === 'summary' && <SummaryStep paperId={paperId} activeTab={activeTab} />}
        {currentStep === 'quiz' && <QuizStep paperId={paperId} />}
        {currentStep === 'stats' && <StatsStep paperId={paperId} />}
      </div>

      {/* 퀴즈 생성 모달 */}
      <QuizGenerationModal
        isOpen={showQuizModal}
        onClose={() => setShowQuizModal(false)}
        onGenerate={handleGenerateQuiz}
        paperId={paperId}
      />
    </div>
  )
} 