export interface SummaryAnalysis {
  summary_id?: number
  summary_user_id: string
  summary_paper_id: number
  summary_key_points: string[]
  summary_mistake_patterns: string[]
  summary_learning_priority: string
  summary_quick_tip: string
  summary_created_at?: string
  summary_updated_at?: string
}

export interface CreateSummaryAnalysisRequest {
  summary_user_id: string
  summary_paper_id: number
  summary_key_points: string[]
  summary_mistake_patterns: string[]
  summary_learning_priority: string
  summary_quick_tip: string
}

export interface UpdateSummaryAnalysisRequest {
  summary_key_points?: string[]
  summary_mistake_patterns?: string[]
  summary_learning_priority?: string
  summary_quick_tip?: string
} 