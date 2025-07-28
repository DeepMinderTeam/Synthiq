'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface AIAnalysisState {
  isGeneratingSummary: boolean
  isGeneratingQuiz: boolean
  isTranslating: boolean
  currentPaperId: string | null
  currentPaperTitle: string | null
  currentTopicId: string | null
  progress: {
    summary: number
    quiz: number
    translation: number
  }
  messages: {
    summary: string | null
    quiz: string | null
    translation: string | null
  }
}

interface AIAnalysisContextType {
  state: AIAnalysisState
  startSummaryGeneration: (paperId: string, paperTitle: string, topicId: string) => void
  startQuizGeneration: (paperId: string, paperTitle: string, topicId: string) => void
  startTranslation: (paperId: string, paperTitle: string, topicId: string) => void
  completeSummaryGeneration: () => void
  completeQuizGeneration: () => void
  completeTranslation: () => void
  updateProgress: (type: 'summary' | 'quiz' | 'translation', progress: number) => void
  updateMessage: (type: 'summary' | 'quiz' | 'translation', message: string | null) => void
  resetState: () => void
}

const AIAnalysisContext = createContext<AIAnalysisContextType | undefined>(undefined)

export function AIAnalysisProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AIAnalysisState>({
    isGeneratingSummary: false,
    isGeneratingQuiz: false,
    isTranslating: false,
    currentPaperId: null,
    currentPaperTitle: null,
    currentTopicId: null,
    progress: {
      summary: 0,
      quiz: 0,
      translation: 0
    },
    messages: {
      summary: null,
      quiz: null,
      translation: null
    }
  })

  const startSummaryGeneration = (paperId: string, paperTitle: string, topicId: string) => {
    setState(prev => ({
      ...prev,
      isGeneratingSummary: true,
      currentPaperId: paperId,
      currentPaperTitle: paperTitle,
      currentTopicId: topicId,
      progress: { ...prev.progress, summary: 0 },
      messages: { ...prev.messages, summary: `${paperTitle}의 AI 정리노트를 생성하고 있습니다...` }
    }))
    
    // 진행률 시뮬레이션
    simulateProgress('summary')
  }

  const startQuizGeneration = (paperId: string, paperTitle: string, topicId: string) => {
    setState(prev => ({
      ...prev,
      isGeneratingQuiz: true,
      currentPaperId: paperId,
      currentPaperTitle: paperTitle,
      currentTopicId: topicId,
      progress: { ...prev.progress, quiz: 0 },
      messages: { ...prev.messages, quiz: `${paperTitle}의 AI 퀴즈를 생성하고 있습니다...` }
    }))
    
    // 진행률 시뮬레이션
    simulateProgress('quiz')
  }

  const startTranslation = (paperId: string, paperTitle: string, topicId: string) => {
    setState(prev => ({
      ...prev,
      isTranslating: true,
      currentPaperId: paperId,
      currentPaperTitle: paperTitle,
      currentTopicId: topicId,
      progress: { ...prev.progress, translation: 0 },
      messages: { ...prev.messages, translation: `${paperTitle}의 번역을 생성하고 있습니다...` }
    }))
    
    // 진행률 시뮬레이션
    simulateProgress('translation')
  }

  const completeSummaryGeneration = () => {
    setState(prev => ({
      ...prev,
      isGeneratingSummary: false,
      progress: { ...prev.progress, summary: 100 },
      messages: { ...prev.messages, summary: `${prev.currentPaperTitle}의 AI 정리노트 생성이 완료되었습니다!` }
    }))
    // 5초 후 메시지 제거
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        messages: { ...prev.messages, summary: null },
        currentPaperTitle: null
      }))
    }, 5000)
  }

  const completeQuizGeneration = () => {
    setState(prev => ({
      ...prev,
      isGeneratingQuiz: false,
      progress: { ...prev.progress, quiz: 100 },
      messages: { ...prev.messages, quiz: `${prev.currentPaperTitle}의 AI 퀴즈 생성이 완료되었습니다!` }
    }))
    // 5초 후 메시지 제거
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        messages: { ...prev.messages, quiz: null },
        currentPaperTitle: null
      }))
    }, 5000)
  }

  const completeTranslation = () => {
    setState(prev => ({
      ...prev,
      isTranslating: false,
      progress: { ...prev.progress, translation: 100 },
      messages: { ...prev.messages, translation: `${prev.currentPaperTitle}의 번역이 완료되었습니다!` }
    }))
    // 5초 후 메시지 제거
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        messages: { ...prev.messages, translation: null },
        currentPaperTitle: null
      }))
    }, 5000)
  }

  const updateProgress = (type: 'summary' | 'quiz' | 'translation', progress: number) => {
    setState(prev => ({
      ...prev,
      progress: { ...prev.progress, [type]: progress }
    }))
  }

  const updateMessage = (type: 'summary' | 'quiz' | 'translation', message: string | null) => {
    setState(prev => ({
      ...prev,
      messages: { ...prev.messages, [type]: message }
    }))
  }

  // 진행률 시뮬레이션 함수
  const simulateProgress = (type: 'summary' | 'quiz' | 'translation') => {
    const steps = [10, 25, 40, 60, 80, 95]
    let currentStep = 0
    
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        updateProgress(type, steps[currentStep])
        currentStep++
      } else {
        clearInterval(interval)
      }
    }, 800) // 800ms마다 진행률 업데이트
  }

  const resetState = () => {
    setState({
      isGeneratingSummary: false,
      isGeneratingQuiz: false,
      isTranslating: false,
      currentPaperId: null,
      currentPaperTitle: null,
      currentTopicId: null,
      progress: {
        summary: 0,
        quiz: 0,
        translation: 0
      },
      messages: {
        summary: null,
        quiz: null,
        translation: null
      }
    })
  }

  return (
    <AIAnalysisContext.Provider value={{
      state,
      startSummaryGeneration,
      startQuizGeneration,
      startTranslation,
      completeSummaryGeneration,
      completeQuizGeneration,
      completeTranslation,
      updateProgress,
      updateMessage,
      resetState
    }}>
      {children}
    </AIAnalysisContext.Provider>
  )
}

export function useAIAnalysis() {
  const context = useContext(AIAnalysisContext)
  if (context === undefined) {
    throw new Error('useAIAnalysis must be used within a AIAnalysisProvider')
  }
  return context
} 