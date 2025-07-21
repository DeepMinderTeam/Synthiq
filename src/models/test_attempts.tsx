// 사용자의 테스트 응시 기록을 저장하는 테이블
export interface TestAttempt {
  attempt_id: number; // 응시 고유 ID
  attempt_user_id: string; // 응시자(유저) UUID
  attempt_test_id: number; // 소속 테스트 ID
  attempt_score?: number; // 점수
  attempt_duration_sec?: number; // 소요 시간(초)
  attempt_created_at: string; // 응시 일시 (ISO 문자열)
} 