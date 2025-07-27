// 논문 콘텐츠에 대한 요약 정보를 저장하는 테이블
export interface PaperSummary {
  summary_id: number; // 요약 고유 ID
  summary_content_id: number; // 소속 콘텐츠 ID
  summary_type?: string; // 요약 타입(예: 한줄 요약 등)
  summary_text: string; // 요약 텍스트
  summary_text_self?: string; // 사용자가 작성한 요약 텍스트
} 