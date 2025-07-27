'use client'

import { usePaperStore, type LearningStep } from '@/hooks/paperStore'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CheckIcon } from '@heroicons/react/24/solid'
import { PaperContent, StepContent, ReadingStep, TopBar } from '@/components'
import Sidebar from '@/components/Sidebar'
import { SidebarProvider } from '@/context/SidebarContext'
import { Stepper, Step, StepLabel } from '@mui/material'
import { styled } from '@mui/material/styles'

const steps: { key: LearningStep; label: string }[] = [
  { key: 'reading', label: '논문 읽기' },
  { key: 'summary', label: '논문 요약' },
  { key: 'quiz', label: '논문 퀴즈' },
  { key: 'stats', label: '논문 통계' }
]

const CustomStepper = styled(Stepper)(() => ({
  '& .MuiStepConnector-root': {
    top: '25px', // 원의 중앙에 맞춤 (원 크기 50px의 절반)
    zIndex: 1, // 원보다 아래에 위치
  },
  '& .MuiStepConnector-line': {
    borderColor: '#e5e7eb',
    borderTopWidth: 3,
  },
  '& .MuiStepConnector-root.Mui-active .MuiStepConnector-line': {
    borderColor: '#8b5cf6',
    borderTopWidth: 3,
  },
  '& .MuiStepConnector-root.Mui-completed .MuiStepConnector-line': {
    borderColor: '#3b82f6',
    borderTopWidth: 3,
  },
}))

interface CustomStepIconProps {
  completed?: boolean
  active?: boolean
}

const CustomStepIcon = styled('div')<CustomStepIconProps>(({ completed, active }) => ({
  width: 50,
  height: 50,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1.25rem',
  fontWeight: 'bold',
  color: completed || active ? '#ffffff' : '#6b7280',
  background: completed
    ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #3b82f6 100%)' // Blue-purple gradient for completed
    : active
      ? 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 50%, #8b5cf6 100%)' // Purple-blue gradient for active
      : '#ffffff',
  border: completed || active ? '3px solid #e5e7eb' : '3px solid #e5e7eb',
  boxShadow: completed || active ? '0 10px 25px rgba(139, 92, 246, 0.3)' : '0 4px 6px rgba(0, 0, 0, 0.1)',
  transition: 'all 0.3s ease',
  cursor: 'pointer',
  position: 'relative',
  zIndex: 10, // 원을 선보다 훨씬 위에 위치시킴
  '&:hover': {
    transform: 'scale(1.1)',
    boxShadow: '0 15px 35px rgba(139, 92, 246, 0.4)',
  },
}))

interface PaperLearningPageProps {
  params: {
    topicId: string
    paperId: string
  }
}

export default function PaperLearningPage({ params }: PaperLearningPageProps) {
  const { currentStep, setCurrentStep } = usePaperStore()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const { user } = useAuth()
  const router = useRouter()

  const { paperId } = params

  const getCurrentStepIndex = () => steps.findIndex(s => s.key === currentStep)
  const handleStepClick = (index: number) => setCurrentStep(steps[index].key)

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-gray-50">
        <Sidebar userName={user?.name || '사용자'} userEmail={user?.email || ''} />

        <div className="flex-1 flex flex-col overflow-y-auto">
          <TopBar />

          {/* Stepper Header */}
          <header className="bg-white border-b px-6 py-8 shadow-sm sticky top-0 z-20">
            <div className="w-full max-w-4xl mx-auto">
              <CustomStepper activeStep={getCurrentStepIndex()} alternativeLabel>
                {steps.map((step, index) => {
                  const isCompleted = index < getCurrentStepIndex()
                  const isCurrent = index === getCurrentStepIndex()

                  return (
                    <Step key={step.key} completed={isCompleted} active={isCurrent}>
                      <StepLabel
                        onClick={() => handleStepClick(index)}
                        sx={{
                          cursor: 'pointer',
                          '& .MuiStepLabel-label': {
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            color: isCompleted ? '#3b82f6' : isCurrent ? '#8b5cf6' : '#6b7280',
                            '&:hover': {
                              color: '#8b5cf6',
                            },
                          },
                        }}
                        StepIconComponent={(props) => (
                          <CustomStepIcon
                            completed={isCompleted}
                            active={isCurrent}
                            onClick={() => handleStepClick(index)}
                          >
                            {isCompleted ? (
                              <CheckIcon style={{ width: '1.5rem', height: '1.5rem' }} />
                            ) : (
                              index + 1
                            )}
                          </CustomStepIcon>
                        )}
                      >
                        {step.label}
                      </StepLabel>
                    </Step>
                  )
                })}
              </CustomStepper>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1">
            <div className="p-4 sm:p-8">
              {currentStep === 'reading' ? (
                <div className="w-full h-full">
                  <ReadingStep paperId={paperId} />
                </div>
              ) : (
                <div className="flex w-full h-full transition-all duration-500 gap-4">
                  {/* 왼쪽 패널 */}
                  <div
                    className={`overflow-hidden transition-all duration-500 ease-in-out 
                    ${isCollapsed ? 'basis-[6%]' : 'basis-[50%]'}`}
                  >
                    <PaperContent
                      paperId={paperId}
                      isCollapsed={isCollapsed}
                    />
                  </div>

                  {/* 오른쪽 패널 */}
                  <div
                    className={`overflow-hidden transition-all duration-500 ease-in-out 
                    ${isCollapsed ? 'basis-[94%]' : 'basis-[50%]'}`}
                  >
                    <StepContent
                      currentStep={currentStep}
                      paperId={paperId}
                      isPaperContentCollapsed={isCollapsed}
                      onTogglePaperContent={() => setIsCollapsed(!isCollapsed)}
                    />
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    const index = getCurrentStepIndex()
                    if (index > 0) setCurrentStep(steps[index - 1].key)
                  }}
                  disabled={currentStep === 'reading'}
                  className="px-6 py-3 bg-gray-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors text-sm font-medium shadow-sm"
                >
                  이전 단계
                </button>
                <button
                  onClick={() => {
                    const index = getCurrentStepIndex()
                    if (index < steps.length - 1) setCurrentStep(steps[index + 1].key)
                  }}
                  disabled={currentStep === 'stats'}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors text-sm font-medium shadow-sm"
                >
                  다음 단계
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
