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