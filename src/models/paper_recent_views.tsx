export interface PaperRecentView {
    /** 논문을 조회한 사용자 ID */
    view_user_id: string;
  
    /** 조회한 논문 ID */
    view_paper_id: number;
  
    /** 마지막으로 본 시각 */
    view_last_viewed_at: string;
  }