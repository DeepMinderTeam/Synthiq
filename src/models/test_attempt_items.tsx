// 테스트 응시 시 각 퀴즈별 응답 정보를 저장하는 테이블
export interface TestAttemptItem {
  attempt_item_id: number; // 응시 항목 고유 ID
  attempt_item_attempt_id: number; // 소속 응시 ID
  attempt_item_quiz_id: number; // 소속 퀴즈 ID
  attempt_user_answer?: string; // 사용자의 답변
  attempt_is_correct?: boolean; // 정답 여부
  attempt_score?: number; // AI 채점 점수 (0-100)
  attempt_feedback?: string; // AI 피드백
  attempt_explanation?: string; // AI 상세 해설
} 