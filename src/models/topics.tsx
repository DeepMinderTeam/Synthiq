// 주제(Topic) 정보를 저장하는 테이블
export interface Topic {
  topic_id: number; // 주제 고유 ID
  topic_user_id: string; // 주제 생성자(유저) UUID
  topic_name: string; // 주제명
  topic_description?: string; // 주제 설명
  topic_created_at: string; // 생성일시 (ISO 문자열)
} 