// 논문 읽기 단계를 표시하는 컴포넌트
// Supabase에서 실제 논문 정보를 가져와서 표시
'use client'

import PaperContent from '@/components/PaperContent'

interface ReadingStepProps {
  paperId: string
}

export default function ReadingStep({ paperId }: ReadingStepProps) {
  return (
          <div className="h-full">
      <PaperContent paperId={paperId} />
    </div>
  )
} 