import { create } from 'zustand'

export type LearningStep = 'reading' | 'summary' | 'quiz' | 'stats'

interface PaperStore {
  currentStep: LearningStep
  setCurrentStep: (step: LearningStep) => void
  resetStep: () => void
}

export const usePaperStore = create<PaperStore>((set) => ({
  currentStep: 'reading',
  setCurrentStep: (step) => set({ currentStep: step }),
  resetStep: () => set({ currentStep: 'reading' })
})) 