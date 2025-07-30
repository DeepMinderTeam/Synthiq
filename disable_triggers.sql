-- 트리거 비활성화
DROP TRIGGER IF EXISTS update_learning_analyses_updated_at ON learning_analyses;
DROP TRIGGER IF EXISTS update_summary_analyses_updated_at ON summary_analyses;

-- 트리거 함수도 제거 (선택사항)
-- DROP FUNCTION IF EXISTS update_updated_at_column(); 

-- paper_quizzes 테이블에 근거 관련 열 추가
ALTER TABLE paper_quizzes 
ADD COLUMN IF NOT EXISTS quiz_evidence TEXT,
ADD COLUMN IF NOT EXISTS quiz_evidence_start_index INTEGER,
ADD COLUMN IF NOT EXISTS quiz_evidence_end_index INTEGER;

-- 열에 대한 설명 추가
COMMENT ON COLUMN paper_quizzes.quiz_evidence IS '퀴즈 정답의 근거가 되는 논문 텍스트';
COMMENT ON COLUMN paper_quizzes.quiz_evidence_start_index IS '근거 텍스트의 시작 위치 (문자 인덱스)';
COMMENT ON COLUMN paper_quizzes.quiz_evidence_end_index IS '근거 텍스트의 끝 위치 (문자 인덱스)'; 