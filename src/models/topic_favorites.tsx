export interface TopicFavorite {
    /** 즐겨찾기한 사용자 ID (uuid) */
    fav_user_id: string;
  
    /** 즐겨찾기된 토픽 ID (bigint) */
    fav_topic_id: number;
  
    /** 즐겨찾기한 시간 (timestamp) */
    fav_created_at: string; // ISO 8601 형식의 문자열
  }