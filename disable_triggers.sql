-- 트리거 비활성화
DROP TRIGGER IF EXISTS update_learning_analyses_updated_at ON learning_analyses;
DROP TRIGGER IF EXISTS update_summary_analyses_updated_at ON summary_analyses;

-- 트리거 함수도 제거 (선택사항)
-- DROP FUNCTION IF EXISTS update_updated_at_column(); 