// 논문 기반 테스트(시험) 정보를 저장하는 테이블
export interface PaperTest {
  test_id: number; // 테스트 고유 ID
  test_paper_id: number; // 소속 논문 ID
  test_title: string; // 테스트 제목
  test_created_at: string; // 생성일시 (ISO 문자열)
} 