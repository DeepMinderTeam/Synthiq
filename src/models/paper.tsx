// 논문(Paper) 정보를 저장하는 테이블
export interface Paper {
  paper_id: number; // 논문 고유 ID
  paper_topic_id: number; // 소속 주제 ID
  paper_title: string; // 논문 제목
  paper_abstract?: string; // 논문 초록
  paper_url?: string; // 논문 URL
  paper_created_at: string; // 생성일시 (ISO 문자열)
} 