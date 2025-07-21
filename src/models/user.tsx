// Supabase user 테이블 구조에 맞는 모델
// id: 유저 고유 식별자(UUID)
// email: 이메일 주소
// name: 이름
// created_at: 생성일시

export interface User {
  id: string; // 유저 UUID
  email: string; // 이메일
  name: string; // 이름
  created_at: string; // 생성일시 (ISO 문자열)
} 