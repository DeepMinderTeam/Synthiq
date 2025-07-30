// 오답노트 관련 타입 정의

export interface WrongAnswerNote {
  note_id: number
  note_user_id: string
  note_attempt_item_id: number
  note_mistake_count: number
  note_last_wrong_date: string
  note_created_at: string
  note_updated_at: string
}

export interface WrongAnswerStudySession {
  session_id: number
  session_note_id: number
  session_user_id: string
  session_date: string
  session_result: boolean
  session_answer?: string
  session_feedback?: string
}

export interface CreateWrongAnswerNoteRequest {
  attemptItemId: number
}

export interface UpdateWrongAnswerNoteRequest {
  noteId: number
  explanation?: string
  evidence?: string
  evidenceContentId?: number
  evidenceStartIndex?: number
  evidenceEndIndex?: number
  category?: string
  difficulty?: string
}

export interface CreateStudySessionRequest {
  noteId: number
  result: boolean
  answer?: string
  feedback?: string
} 