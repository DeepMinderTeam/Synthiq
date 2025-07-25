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
  switch (currentStep) {
    case 'reading':
      return <ReadingStep paperId={paperId} />
    case 'summary':
      return <SummaryStep paperId={paperId} />
    case 'quiz':
      return <QuizStep paperId={paperId} />
    case 'stats':
      return <StatsStep paperId={paperId} />
    default:
      return null
  }
} 