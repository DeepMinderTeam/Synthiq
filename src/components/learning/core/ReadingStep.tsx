// 논문 읽기 단계를 표시하는 컴포넌트
'use client'

import PaperContent from '@/components/paper/PaperContent'

interface ReadingStepProps {
  paperId: string
  topicId: string
}

export default function ReadingStep({ paperId, topicId }: ReadingStepProps) {
  return <PaperContent paperId={paperId} topicId={topicId} />
} 