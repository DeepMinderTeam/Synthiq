// 논문 학습 페이지입니다.
// 논문 학습 메인 페이지 (요약, 퀴즈, 정리 진입점)
// pdf올리기 -> 내용 정리(마크다운 형식) -> 퀴즈풀기
'use client'

import { usePaperStore, type LearningStep } from '@/hooks/paperStore'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Tab } from '@headlessui/react'
import { CheckIcon } from '@heroicons/react/24/solid'
import { PaperContent, StepContent, ReadingStep } from '@/components'
import Sidebar from '@/components/Sidebar'

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

  const { user } = useAuth()
  const router = useRouter()

  const { paperId } = params

  const getCurrentStepIndex = () => {
    return steps.findIndex(s => s.key === currentStep)
  }

  return (

    <div className="flex min-h-screen bg-gray-50">
             <Sidebar userName={user?.name || '사용자'} />
      
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b px-4 sm:px-8 py-4 shadow-sm">
          <div 
            className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-800 cursor-pointer hover:text-blue-600 transition-colors"
            onClick={() => router.push('/')}
          >
            DeepMinder
          </div>
          
          {/* Progress Steps with Headless UI */}
          <Tab.Group selectedIndex={getCurrentStepIndex()} onChange={(index) => setCurrentStep(steps[index].key)}>
            <Tab.List className="flex space-x-2 rounded-2xl bg-gradient-to-r from-gray-50 to-gray-100 p-2 w-full max-w-4xl mx-auto shadow-inner">
              {steps.map((step, index) => {
                const isCompleted = index < getCurrentStepIndex()
                const isCurrent = index === getCurrentStepIndex()
                
                return (
                  <Tab
                    key={step.key}
                    className={({ selected }) =>
                      `flex-1 rounded-xl py-3 px-4 text-sm font-medium leading-5 transition-all duration-300 transform hover:scale-105
                      ${isCompleted 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg' 
                        : isCurrent 
                        ? 'bg-white text-blue-600 shadow-lg border-2 border-blue-200' 
                        : 'text-gray-500 hover:bg-white hover:text-gray-700 hover:shadow-md'
                      }`
                    }
                  >
                    <div className="flex items-center justify-center space-x-3">
                      {isCompleted ? (
                        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                          <CheckIcon className="w-4 h-4 text-white" />
                        </div>
                      ) : (
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                          ${isCurrent 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-300 text-gray-600'
                          }`}>
                          {index + 1}
                        </div>
                      )}
                      <span className="hidden sm:inline font-medium">{step.label}</span>
                    </div>
                  </Tab>
                )
              })}
            </Tab.List>
          </Tab.Group>
        </header>

        <main className="flex-1 p-4 sm:p-8">
          {currentStep === 'reading' ? (
            // 읽기 단계: PDF만 전체 화면에 표시
            <div className="w-full h-full">
              <ReadingStep paperId={paperId} />
            </div>
          ) : (
            // 다른 단계: 2열 레이아웃
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8 h-full">
              {/* Left Panel */}
              <div className="w-full overflow-hidden bg-white rounded-lg shadow-sm">
                <PaperContent paperId={paperId} />
              </div>

              {/* Right Panel */}
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm w-full overflow-hidden">
                <StepContent 
                  currentStep={currentStep}
                  paperId={paperId}
                />
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={() => {
                const currentIndex = getCurrentStepIndex()
                if (currentIndex > 0) {
                  setCurrentStep(steps[currentIndex - 1].key)
                }
              }}
              disabled={currentStep === 'reading'}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors text-sm font-medium shadow-sm"
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
              className="px-6 py-3 bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors text-sm font-medium shadow-sm"
            >
              다음 단계
            </button>
          </div>
        </main>
      </div>
    </div>
  )
}