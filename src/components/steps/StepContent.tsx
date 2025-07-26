// 논문 학습 단계별 내용을 통합 관리하는 컴포넌트
// 현재 단계에 따라 적절한 컴포넌트(읽기/요약/퀴즈/통계)를 렌더링
import { type LearningStep } from '@/hooks/paperStore'
import ReadingStep from './ReadingStep'
import SummaryStep from './SummaryStep'
import QuizStep from './QuizStep'
import StatsStep from './StatsStep'

interface StepContentProps {
  currentStep: LearningStep
  paperId: string
}

export default function StepContent({ currentStep, paperId }: StepContentProps) {
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
        <h3 className="text-lg font-semibold text-gray-800">{getStepTitle()}</h3>
      </div>
      <div className="flex-1 p-4 sm:p-6 overflow-hidden">
        {currentStep === 'reading' && <ReadingStep paperId={paperId} />}
        {currentStep === 'summary' && <SummaryStep paperId={paperId} />}
        {currentStep === 'quiz' && <QuizStep paperId={paperId} />}
        {currentStep === 'stats' && <StatsStep paperId={paperId} />}
      </div>
    </div>
  )
} 