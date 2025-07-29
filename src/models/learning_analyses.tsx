export interface LearningAnalysis {
  analysis_id?: number
  analysis_user_id: string
  analysis_paper_id: number
  analysis_summary: string
  analysis_weak_areas: string[]
  analysis_key_concepts: string[]
  analysis_study_recommendations: string[]
  analysis_common_mistakes: string[]
  analysis_improvement_plan: string
  analysis_motivation_message: string
  analysis_created_at?: string
  analysis_updated_at?: string
}

export interface CreateLearningAnalysisRequest {
  analysis_user_id: string
  analysis_paper_id: number
  analysis_summary: string
  analysis_weak_areas: string[]
  analysis_key_concepts: string[]
  analysis_study_recommendations: string[]
  analysis_common_mistakes: string[]
  analysis_improvement_plan: string
  analysis_motivation_message: string
}

export interface UpdateLearningAnalysisRequest {
  analysis_summary?: string
  analysis_weak_areas?: string[]
  analysis_key_concepts?: string[]
  analysis_study_recommendations?: string[]
  analysis_common_mistakes?: string[]
  analysis_improvement_plan?: string
  analysis_motivation_message?: string
} 