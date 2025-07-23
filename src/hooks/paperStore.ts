// import { create } from 'zustand'

// export type LearningStep = 'reading' | 'summary' | 'quiz' | 'stats'

// interface PaperContent {
//   title: string
//   content: string
// }

// interface PaperSummary {
//   points: string[]
//   conclusion: string
// }

// interface PaperStore {
//   currentStep: LearningStep
//   paperContent: PaperContent
//   paperSummary: PaperSummary
//   setCurrentStep: (step: LearningStep) => void
//   setPaperContent: (content: PaperContent) => void
//   setPaperSummary: (summary: PaperSummary) => void
// }

// export const usePaperStore = create<PaperStore>((set) => ({
//   currentStep: 'reading',
//   paperContent: {
//     title: '논문 제목',
//     content: '논문 내용이 여기에 표시됩니다...',
//   },
//   paperSummary: {
//     points: [
//       '첫 번째 요약 포인트입니다.',
//       '두 번째 요약 포인트입니다.',
//       '세 번째 요약 포인트입니다.',
//     ],
//     conclusion: '결론 부분입니다.',
//   },
//   setCurrentStep: (step) => set({ currentStep: step }),
//   setPaperContent: (content) => set({ paperContent: content }),
//   setPaperSummary: (summary) => set({ paperSummary: summary }),
// })) 