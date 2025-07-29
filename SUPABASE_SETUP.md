# Supabase Storage 설정 가이드

## 1. Supabase Storage 버킷 생성

Supabase 대시보드에서 다음 단계를 따라 Storage 버킷을 생성하세요:

1. **Supabase 대시보드 접속**
   - https://supabase.com/dashboard 에서 프로젝트 선택

2. **Storage 메뉴로 이동**
   - 왼쪽 사이드바에서 "Storage" 클릭

3. **새 버킷 생성**
   - "New bucket" 버튼 클릭
   - 버킷 이름: `papers`
   - Public bucket: 체크 해제 (보안을 위해)
   - "Create bucket" 클릭

## 2. Storage 정책 설정 (단순화)

Storage는 단순히 파일 저장용으로만 사용하므로, 모든 인증된 사용자에게 업로드 권한을 부여합니다:

```sql
-- 모든 인증된 사용자에게 Storage 업로드 권한
CREATE POLICY "Enable storage for authenticated users" ON storage.objects
FOR ALL USING (auth.role() = 'authenticated');
```

## 3. Paper 테이블 정책 설정

실제 권한 관리는 `paper` 테이블에서 수행합니다:

```sql
-- 사용자가 자신의 주제에만 논문 추가 가능
CREATE POLICY "Allow users to insert papers under their own topics"
ON paper
FOR INSERT
TO authenticated
WITH CHECK (
  paper_topic_id IN (
    SELECT topic_id FROM topics
    WHERE topic_user_id = auth.uid()
  )
);

-- 사용자가 자신의 주제의 논문만 조회 가능
CREATE POLICY "Allow users to select papers under their own topics"
ON paper
FOR SELECT
TO authenticated
USING (
  paper_topic_id IN (
    SELECT topic_id FROM topics
    WHERE topic_user_id = auth.uid()
  )
);

-- 사용자가 자신의 주제의 논문만 수정 가능
CREATE POLICY "Allow users to update papers under their own topics"
ON paper
FOR UPDATE
TO authenticated
USING (
  paper_topic_id IN (
    SELECT topic_id FROM topics
    WHERE topic_user_id = auth.uid()
  )
);

-- 사용자가 자신의 주제의 논문만 삭제 가능
CREATE POLICY "Allow users to delete papers under their own topics"
ON paper
FOR DELETE
TO authenticated
USING (
  paper_topic_id IN (
    SELECT topic_id FROM topics
    WHERE topic_user_id = auth.uid()
  )
);
```

## 4. 환경 변수 확인

`.env.local` 파일에 다음 환경 변수가 설정되어 있는지 확인:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 5. 파일 구조

업로드된 PDF 파일은 다음 구조로 저장됩니다:
```
papers/
├── {topicId}/
│   ├── {timestamp}_{filename}.pdf
│   └── ...
```

`paper` 테이블의 `paper_url` 컬럼에 이 경로가 저장됩니다.

## 6. 보안 고려사항

- 파일 크기 제한: 10MB
- 파일 타입 제한: PDF만 허용
- 인증된 사용자만 접근 가능
- 사용자는 자신의 주제에만 논문 추가 가능
- 파일명 중복 방지를 위한 타임스탬프 추가

## 7. 문제 해결

### 업로드 실패 시 확인사항:
1. Supabase 프로젝트 URL과 API 키가 올바른지 확인
2. Storage 버킷이 생성되었는지 확인
3. Storage와 paper 테이블의 RLS 정책이 올바르게 설정되었는지 확인
4. 사용자가 인증되었는지 확인
5. 사용자가 해당 주제의 소유자인지 확인

### 일반적인 오류:
- `Bucket not found`: 버킷 이름 확인
- `Policy violation`: RLS 정책 확인
- `File too large`: 파일 크기 제한 확인
- `Invalid file type`: PDF 파일인지 확인
- `Unauthorized`: 사용자 권한 확인 

# Supabase 설정 가이드

## 데이터베이스 스키마

### 기존 테이블 수정

#### paper_quizzes 테이블에 quiz_category 열 추가
```sql
-- paper_quizzes 테이블에 quiz_category 열 추가
ALTER TABLE paper_quizzes 
ADD COLUMN quiz_category TEXT;

-- 기존 데이터에 기본값 설정 (선택사항)
UPDATE paper_quizzes 
SET quiz_category = '일반 학습' 
WHERE quiz_category IS NULL;

-- 열에 대한 설명 추가
COMMENT ON COLUMN paper_quizzes.quiz_category IS '퀴즈 카테고리 (예: 개념 이해, 원리 및 구조, 실험 및 결과 등)';
```

### 기존 테이블 구조

#### paper_quizzes 테이블
```sql
CREATE TABLE paper_quizzes (
  quiz_id SERIAL PRIMARY KEY,
  quiz_content_id INTEGER REFERENCES paper_contents(content_id) ON DELETE CASCADE,
  quiz_type TEXT,
  quiz_question TEXT NOT NULL,
  quiz_choices JSONB,
  quiz_answer TEXT NOT NULL,
  quiz_explanation TEXT,
  quiz_category TEXT -- 새로 추가된 열
);
```

## RLS (Row Level Security) 설정

### paper_quizzes 테이블
```sql
-- RLS 활성화
ALTER TABLE paper_quizzes ENABLE ROW LEVEL SECURITY;

-- 정책: 사용자는 자신이 생성한 퀴즈만 볼 수 있음
CREATE POLICY "Users can view quizzes from their papers" ON paper_quizzes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM paper_contents pc
      JOIN paper p ON pc.content_paper_id = p.paper_id
      WHERE pc.content_id = paper_quizzes.quiz_content_id
      AND p.paper_user_id = auth.uid()
    )
  );

-- 정책: 사용자는 자신의 논문에 퀴즈를 생성할 수 있음
CREATE POLICY "Users can insert quizzes to their papers" ON paper_quizzes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM paper_contents pc
      JOIN paper p ON pc.content_paper_id = p.paper_id
      WHERE pc.content_id = paper_quizzes.quiz_content_id
      AND p.paper_user_id = auth.uid()
    )
  );
```

## 인덱스 설정

### 성능 최적화를 위한 인덱스
```sql
-- quiz_content_id에 대한 인덱스
CREATE INDEX idx_paper_quizzes_content_id ON paper_quizzes(quiz_content_id);

-- quiz_type에 대한 인덱스
CREATE INDEX idx_paper_quizzes_type ON paper_quizzes(quiz_type);

-- quiz_category에 대한 인덱스 (새로 추가)
CREATE INDEX idx_paper_quizzes_category ON paper_quizzes(quiz_category);

-- 복합 인덱스
CREATE INDEX idx_paper_quizzes_content_type ON paper_quizzes(quiz_content_id, quiz_type);
```

## 사용 예시

### 퀴즈 생성 시 카테고리 포함
```typescript
const newQuiz = {
  quiz_content_id: contentId,
  quiz_type: 'multiple_choice',
  quiz_question: '문제 내용',
  quiz_choices: ['선택지1', '선택지2', '선택지3', '선택지4'],
  quiz_answer: '정답',
  quiz_explanation: '해설',
  quiz_category: '개념 이해' // 새로 추가된 필드
};
```

### 카테고리별 퀴즈 조회
```typescript
const { data: quizzes } = await supabase
  .from('paper_quizzes')
  .select('*')
  .eq('quiz_category', '개념 이해');
``` 

# Supabase 설정 가이드

## 데이터베이스 테이블 생성

### 1. 사용자 테이블 (users)
```sql
CREATE TABLE users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) UNIQUE NOT NULL,
  user_name VARCHAR(100),
  user_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. 주제 테이블 (topics)
```sql
CREATE TABLE topics (
  topic_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  topic_title VARCHAR(255) NOT NULL,
  topic_description TEXT,
  topic_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  topic_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. 논문 테이블 (paper)
```sql
CREATE TABLE paper (
  paper_id SERIAL PRIMARY KEY,
  paper_user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  paper_topic_id UUID REFERENCES topics(topic_id) ON DELETE CASCADE,
  paper_title VARCHAR(500) NOT NULL,
  paper_abstract TEXT,
  paper_url TEXT,
  paper_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paper_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. 논문 내용 테이블 (paper_contents)
```sql
CREATE TABLE paper_contents (
  content_id SERIAL PRIMARY KEY,
  content_paper_id INTEGER REFERENCES paper(paper_id) ON DELETE CASCADE,
  content_type VARCHAR(100),
  content_index INTEGER NOT NULL,
  content_text TEXT NOT NULL,
  content_text_eng TEXT,
  content_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  content_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5. 논문 하이라이트 테이블 (paper_highlights)
```sql
CREATE TABLE paper_highlights (
  highlight_id SERIAL PRIMARY KEY,
  highlight_paper_id INTEGER REFERENCES paper(paper_id) ON DELETE CASCADE,
  highlight_content_id INTEGER REFERENCES paper_contents(content_id) ON DELETE CASCADE,
  highlight_page_id VARCHAR(100),
  highlight_text TEXT NOT NULL,
  highlight_color VARCHAR(50) NOT NULL,
  highlight_start_offset INTEGER NOT NULL,
  highlight_end_offset INTEGER NOT NULL,
  highlight_user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  highlight_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  highlight_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 6. 논문 요약 테이블 (paper_summaries)
```sql
CREATE TABLE paper_summaries (
  summary_id SERIAL PRIMARY KEY,
  summary_paper_id INTEGER REFERENCES paper(paper_id) ON DELETE CASCADE,
  summary_user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  summary_type VARCHAR(50) NOT NULL, -- 'ai' or 'self'
  summary_content TEXT NOT NULL,
  summary_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  summary_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 7. 논문 퀴즈 테이블 (paper_quizzes)
```sql
CREATE TABLE paper_quizzes (
  quiz_id SERIAL PRIMARY KEY,
  quiz_paper_id INTEGER REFERENCES paper(paper_id) ON DELETE CASCADE,
  quiz_user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  quiz_title VARCHAR(255),
  quiz_description TEXT,
  quiz_options JSONB, -- 퀴즈 생성 옵션 저장
  quiz_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  quiz_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 8. 퀴즈 문제 테이블 (paper_test_items)
```sql
CREATE TABLE paper_test_items (
  test_item_id SERIAL PRIMARY KEY,
  test_item_quiz_id INTEGER REFERENCES paper_quizzes(quiz_id) ON DELETE CASCADE,
  test_item_question TEXT NOT NULL,
  test_item_type VARCHAR(50) NOT NULL, -- 'multiple_choice', 'ox_quiz', 'short_answer', 'essay'
  test_item_options JSONB, -- 객관식 보기들
  test_item_answer TEXT NOT NULL,
  test_item_explanation TEXT,
  test_item_difficulty VARCHAR(20), -- 'easy', 'medium', 'hard'
  test_item_category VARCHAR(100),
  test_item_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 9. 퀴즈 시도 테이블 (test_attempts)
```sql
CREATE TABLE test_attempts (
  attempt_id SERIAL PRIMARY KEY,
  attempt_quiz_id INTEGER REFERENCES paper_quizzes(quiz_id) ON DELETE CASCADE,
  attempt_user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  attempt_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  attempt_completed_at TIMESTAMP WITH TIME ZONE,
  attempt_score INTEGER,
  attempt_total_questions INTEGER,
  attempt_correct_answers INTEGER
);
```

### 10. 퀴즈 답안 테이블 (test_attempt_items)
```sql
CREATE TABLE test_attempt_items (
  attempt_item_id SERIAL PRIMARY KEY,
  attempt_item_attempt_id INTEGER REFERENCES test_attempts(attempt_id) ON DELETE CASCADE,
  attempt_item_test_item_id INTEGER REFERENCES paper_test_items(test_item_id) ON DELETE CASCADE,
  attempt_item_user_answer TEXT,
  attempt_item_is_correct BOOLEAN,
  attempt_item_points INTEGER,
  attempt_item_answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- AI 근거 찾기 관련 컬럼 추가
  attempt_item_evidence TEXT, -- AI가 찾은 근거 텍스트
  attempt_item_evidence_content_id INTEGER, -- 근거가 있는 content_id
  attempt_item_evidence_start_index INTEGER, -- 근거 텍스트 시작 위치
  attempt_item_evidence_end_index INTEGER -- 근거 텍스트 끝 위치
);
```

### 11. 최근 조회 테이블 (paper_recent_views)
```sql
CREATE TABLE paper_recent_views (
  view_id SERIAL PRIMARY KEY,
  view_paper_id INTEGER REFERENCES paper(paper_id) ON DELETE CASCADE,
  view_user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  view_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 12. 주제 최근 조회 테이블 (topic_recent_views)
```sql
CREATE TABLE topic_recent_views (
  view_id SERIAL PRIMARY KEY,
  view_topic_id UUID REFERENCES topics(topic_id) ON DELETE CASCADE,
  view_user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  view_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 13. 즐겨찾기 테이블들
```sql
-- 논문 즐겨찾기
CREATE TABLE paper_favorites (
  favorite_id SERIAL PRIMARY KEY,
  favorite_paper_id INTEGER REFERENCES paper(paper_id) ON DELETE CASCADE,
  favorite_user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  favorite_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(favorite_paper_id, favorite_user_id)
);

-- 주제 즐겨찾기
CREATE TABLE topic_favorites (
  favorite_id SERIAL PRIMARY KEY,
  favorite_topic_id UUID REFERENCES topics(topic_id) ON DELETE CASCADE,
  favorite_user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  favorite_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(favorite_topic_id, favorite_user_id)
);
```

## 인덱스 생성

```sql
-- 성능 최적화를 위한 인덱스
CREATE INDEX idx_paper_user_id ON paper(paper_user_id);
CREATE INDEX idx_paper_topic_id ON paper(paper_topic_id);
CREATE INDEX idx_paper_contents_paper_id ON paper_contents(content_paper_id);
CREATE INDEX idx_paper_highlights_paper_id ON paper_highlights(highlight_paper_id);
CREATE INDEX idx_paper_highlights_content_id ON paper_highlights(highlight_content_id);
CREATE INDEX idx_paper_highlights_user_id ON paper_highlights(highlight_user_id);
CREATE INDEX idx_paper_summaries_paper_id ON paper_summaries(summary_paper_id);
CREATE INDEX idx_paper_quizzes_paper_id ON paper_quizzes(quiz_paper_id);
CREATE INDEX idx_paper_test_items_quiz_id ON paper_test_items(test_item_quiz_id);
CREATE INDEX idx_test_attempts_quiz_id ON test_attempts(attempt_quiz_id);
CREATE INDEX idx_test_attempt_items_attempt_id ON test_attempt_items(attempt_item_attempt_id);
CREATE INDEX idx_paper_recent_views_user_id ON paper_recent_views(view_user_id);
CREATE INDEX idx_topic_recent_views_user_id ON topic_recent_views(view_user_id);
```

## RLS (Row Level Security) 정책

```sql
-- 모든 테이블에 RLS 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_test_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_attempt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_recent_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_recent_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_favorites ENABLE ROW LEVEL SECURITY;

-- 사용자 테이블 정책
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = user_id);

-- 주제 테이블 정책
CREATE POLICY "Users can view own topics" ON topics
  FOR ALL USING (auth.uid() = topic_user_id);

-- 논문 테이블 정책
CREATE POLICY "Users can view own papers" ON paper
  FOR ALL USING (auth.uid() = paper_user_id);

-- 논문 내용 테이블 정책
CREATE POLICY "Users can view paper contents" ON paper_contents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM paper 
      WHERE paper.paper_id = paper_contents.content_paper_id 
      AND paper.paper_user_id = auth.uid()
    )
  );

-- 논문 하이라이트 테이블 정책
CREATE POLICY "Users can manage own highlights" ON paper_highlights
  FOR ALL USING (auth.uid() = highlight_user_id);

-- 나머지 테이블들도 유사한 정책 적용...
```

## Storage 버킷 설정

```sql
-- 논문 PDF 파일을 저장할 버킷 생성
INSERT INTO storage.buckets (id, name, public) VALUES ('papers', 'papers', false);

-- Storage 정책 설정
CREATE POLICY "Users can upload own papers" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'papers' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own papers" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'papers' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own papers" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'papers' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );
``` 