// 테스트에 포함된 퀴즈 항목 정보를 저장하는 테이블
export interface PaperTestItem {
  item_id: number; // 항목 고유 ID
  item_test_id: number; // 소속 테스트 ID
  item_quiz_id: number; // 소속 퀴즈 ID
} 