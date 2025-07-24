// 논문 학습 페이지입니다.
// 논문 학습 메인 페이지 (요약, 퀴즈, 정리 진입점)
// pdf올리기 -> 내용 정리(마크다운 형식) -> 퀴즈풀기
'use client'

import { usePaperStore, type LearningStep } from '@/hooks/paperStore'
import { Tab } from '@headlessui/react'
import { CheckIcon } from '@heroicons/react/24/solid'
import { PaperContent, StepContent, ReadingStep } from '@/components'

const steps: { key: LearningStep; label: string }[] = [
  { key: 'reading', label: '논문 읽기' },
  { key: 'summary', label: '논문 요약' },
  { key: 'quiz', label: '논문 퀴즈' },
  { key: 'stats', label: '논문 통계' }
]

interface PaperLearningPageProps {
  params: {
    topicId: string
    paperId: string
  }
}

export default function PaperLearningPage({ params }: PaperLearningPageProps) {
  const { currentStep, setCurrentStep } = usePaperStore()
  const { paperId } = params

  const getCurrentStepIndex = () => {
    return steps.findIndex(s => s.key === currentStep)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 sm:px-8 py-4">
        <div className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">로고 DeepMinder</div>
        
        {/* Progress Steps with Headless UI */}
        <Tab.Group selectedIndex={getCurrentStepIndex()} onChange={(index) => setCurrentStep(steps[index].key)}>
          <Tab.List className="flex space-x-1 rounded-xl bg-gray-100 p-1 max-w-2xl">
            {steps.map((step, index) => {
              const isCompleted = index < getCurrentStepIndex()
              const isCurrent = index === getCurrentStepIndex()
              
              return (
                <Tab
                  key={step.key}
                  className={({ selected }) =>
                    `w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all duration-200
                    ${isCompleted 
                      ? 'bg-red-500 text-white shadow' 
                      : isCurrent 
                      ? 'bg-white text-red-500 shadow' 
                      : 'text-gray-600 hover:bg-white/[0.12] hover:text-gray-800'
                    }`
                  }
                >
                  <div className="flex items-center justify-center space-x-2">
                    {isCompleted ? (
                      <CheckIcon className="w-5 h-5" />
                    ) : (
                      <span className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center text-xs">
                        {index + 1}
                      </span>
                    )}
                    <span className="hidden sm:inline">{step.label}</span>
                  </div>
                </Tab>
              )
            })}
          </Tab.List>
        </Tab.Group>
      </header>

      <main className="p-4 sm:p-8">
        {currentStep === 'reading' ? (
          // 읽기 단계: PDF만 전체 화면에 표시
          <div className="w-full">
            <ReadingStep paperId={paperId} />
          </div>
        ) : (
          // 다른 단계: 2열 레이아웃
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-8">
            {/* Left Panel */}
            <div className="w-full overflow-hidden">
              <PaperContent paperId={paperId} />
            </div>

            {/* Right Panel */}
            <div className="bg-gray-200 p-4 sm:p-6 rounded-lg min-h-96 w-full overflow-hidden">
              <StepContent 
                currentStep={currentStep}
                paperId={paperId}
              />
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <button
            onClick={() => {
              const currentIndex = getCurrentStepIndex()
              if (currentIndex > 0) {
                setCurrentStep(steps[currentIndex - 1].key)
              }
            }}
            disabled={currentStep === 'reading'}
            className="px-4 sm:px-6 py-2 bg-gray-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors text-sm sm:text-base"
          >
            이전 단계
          </button>
          <button
            onClick={() => {
              const currentIndex = getCurrentStepIndex()
              if (currentIndex < steps.length - 1) {
                setCurrentStep(steps[currentIndex + 1].key)
              }
            }}
            disabled={currentStep === 'stats'}
            className="px-4 sm:px-6 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors text-sm sm:text-base"
          >
            다음 단계
          </button>
        </div>
      </main>
    </div>
  )
}