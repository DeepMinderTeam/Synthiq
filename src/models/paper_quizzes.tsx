// 논문 콘텐츠 기반 퀴즈 정보를 저장하는 테이블
export interface PaperQuiz {
  quiz_id: number; // 퀴즈 고유 ID
  quiz_content_id: number; // 소속 콘텐츠 ID
  quiz_type?: string; // 퀴즈 타입(예: 객관식 등)
  quiz_question: string; // 퀴즈 질문
  quiz_choices?: any; // 선택지(JSON, 객관식일 경우)
  quiz_answer: string; // 정답
  quiz_explanation?: string; // 해설
} 