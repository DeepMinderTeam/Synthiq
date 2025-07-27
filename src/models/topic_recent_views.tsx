export interface TopicRecentView {
    /** 토픽을 조회한 사용자 ID */
    view_user_id: string;
  
    /** 조회한 토픽 ID */
    view_topic_id: number;
  
    /** 마지막으로 본 시각 (갱신용) */
    view_last_viewed_at: string;
  }
  