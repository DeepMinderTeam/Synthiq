// 논문 내 세부 콘텐츠(본문, 그림 등)를 저장하는 테이블
export interface PaperContent {
  content_id: number; // 콘텐츠 고유 ID
  content_paper_id: number; // 소속 논문 ID
  content_type?: string; // 콘텐츠 타입(예: 1.서론, 2.기술동향...등)
  content_index: number; // 논문 내 순서
  content_text: string; // 콘텐츠 텍스트
} 