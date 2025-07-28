// 논문 읽기 단계를 표시하는 컴포넌트
'use client'

import PaperContent from '@/components/paper/PaperContent'

interface ReadingStepProps {
  paperId: string
}

export default function ReadingStep({ paperId }: ReadingStepProps) {
  return <PaperContent paperId={paperId} />
} 