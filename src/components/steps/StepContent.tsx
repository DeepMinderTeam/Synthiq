// 논문 학습 단계별 내용을 통합 관리하는 컴포넌트
// 현재 단계에 따라 적절한 컴포넌트(읽기/요약/퀴즈/통계)를 렌더링
import { type LearningStep } from '@/hooks/paperStore'
import { useState } from 'react'
import ReadingStep from './ReadingStep'
import SummaryStep from './SummaryStep'
import QuizStep from './QuizStep'
import StatsStep from './StatsStep'

interface StepContentProps {
  currentStep: LearningStep
  paperId: string
}

export default function StepContent({ currentStep, paperId }: StepContentProps) {
  const [activeTab, setActiveTab] = useState<'ai' | 'self'>('ai')

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

  return (
    <div className="bg-white rounded-lg shadow-sm w-full h-full flex flex-col">
      <div className="p-4 sm:p-6 border-b border-gray-100">
        {currentStep === 'summary' ? (
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800">{getStepTitle()}</h3>
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
        ) : (
          <h3 className="text-lg font-semibold text-gray-800">{getStepTitle()}</h3>
        )}
      </div>
      <div className="flex-1 p-4 sm:p-6 overflow-hidden">
        {currentStep === 'reading' && <ReadingStep paperId={paperId} />}
        {currentStep === 'summary' && <SummaryStep paperId={paperId} activeTab={activeTab} />}
        {currentStep === 'quiz' && <QuizStep paperId={paperId} />}
        {currentStep === 'stats' && <StatsStep paperId={paperId} />}
      </div>
    </div>
  )
} 