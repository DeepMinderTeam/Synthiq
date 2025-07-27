# main_repo

메인 레포지토리입니다. **모든 작업은 이곳에서 진행해주세요.**  
※ 레포지토리 이름과 설명은 추후 프로젝트에 맞게 수정 예정입니다.

---

## 🚀 빠른 시작 (Quick Start)

### 📋 필수 요구사항
- Node.js 18.18.2 이상
- npm 또는 yarn

### 🔧 설치 및 실행

```bash
# 1. 프로젝트 클론
git clone [repository-url]
cd main_repo

# 2. 의존성 설치
npm install

# 3. 환경변수 설정
# .env.local 파일을 생성하고 다음 내용을 추가하세요:
NEXT_PUBLIC_PDF_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# 4. 개발 서버 실행
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

### 📦 사용 가능한 스크립트

```bash
npm run dev      # 개발 서버 실행 (http://localhost:3000)
npm run build    # 프로덕션용 빌드
npm run start    # 프로덕션 서버 실행
npm run lint     # ESLint 실행
```

---

## 🔧 환경변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 환경변수를 설정하세요:

```env
# PDF 텍스트 추출 API URL
NEXT_PUBLIC_PDF_API_URL=http://localhost:8000

# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### PDF API 서버 실행
PDF 텍스트 추출 기능을 사용하려면 별도의 PDF API 서버가 실행되어야 합니다:
- API 서버 URL: `http://localhost:8000`
- 엔드포인트: `POST /process-paper`

---

## 🔀 브랜치 전략 (Branch Strategy)

우리 프로젝트는 **간단하고 명확한 Git 브랜치 전략**을 통해 효율적인 협업을 목표로 합니다.

### 📁 브랜치 종류 및 용도

| 브랜치 이름     | 설명 |
|------------------|------|
| `main`           | 실제 서비스에 배포되는 코드. 항상 안정된 상태 유지 |
| `dev`            | 모든 기능이 병합되는 개발 통합 브랜치 |
| `feature/*`      | 새로운 기능 개발용 브랜치 (ex. `feature/login`) |
| `fix/*`          | 버그 수정용 브랜치 (ex. `fix/navbar-error`) |
| `hotfix/*`       | 운영 중 긴급 수정이 필요한 경우 사용 (ex. `hotfix/token-expiry`) |

> **작업은 항상 `feature/*` 또는 `fix/*` 브랜치에서 시작하며, `dev`를 통해 통합 후 `main`으로 병합합니다.**

---

## 🔧 Pull Request (PR) 규칙

### ✅ PR 병합 흐름

- 작업 브랜치: `feature/*`, `fix/*`, `hotfix/*`
- 병합 대상:
  - 일반 기능/버그: `→ dev`
  - 긴급 수정(hotfix): `→ main` (동시에 `dev`에도 반영)

### ✅ PR 제목 작성 규칙

```
[feat] 로그인 기능 구현 (#이슈번호)
[fix] 이미지 오류 수정 (#23)
[docs] README 개선
```

| 접두어 | 설명 |
|--------|------|
| `feat` | 새로운 기능 |
| `fix`  | 버그 수정 |
| `docs` | 문서 작업 |
| `refactor` | 리팩토링 (기능 변화 없음) |
| `style` | 디자인 작업 |
| `test` | 테스트 코드 추가/수정 |
| `chore` | 기타 변경 (빌드 설정, 패키지 등) |

### ✅ PR 설명 예시

- 작업 목적: 로그인 UI 개선
- 주요 변경 사항: `LoginPage` 컴포넌트 리팩토링, `Form` 추가
- 테스트 여부: 직접 실행 및 로그인 성공 확인
- 관련 이슈: #42

---

## 📝 이슈 (Issue) 작성 규칙

### ✅ 제목 형식

```
[FEATURE] 로그인 화면 UI 개선
[fix] 로그인 시 500 에러 발생
[DOCS] CONTRIBUTING.md 작성
```

| 유형 | 접두어 | 라벨 추천 |
|------|--------|------------|
| 기능 추가 | `[FEATURE]` | `feat` |
| 버그 리포트 | `[fix]` | `fix` |
| 문서 관련 | `[DOCS]` | `docs` |
| 구조 개선 | `[REFACTOR]` | `refactor` |

---

## 🛡 브랜치 보호 규칙 (Branch Protection) — 권장 사항

- `main`, `dev` 브랜치는 직접 푸시 금지 (`force push` 차단)
- PR 병합 전:
  - 리뷰어 1명 이상 승인 필수
  - 자동 테스트(CI)가 통과해야 병합 가능하도록 설정

---

## ✅ 전체 요약

- `main`: 실제 배포용 브랜치 (가장 안정된 버전 유지)
- `dev`: 모든 기능 통합 브랜치 (배포 전 통합 테스트용)
- `feature/*`, `fix/*`: 기능 개발 및 버그 수정 브랜치
- PR 제목 예시: `[feat] 프로필 편집 기능 구현`
- 이슈 제목 예시: `#53/fix: 다크모드 토글 오류 수정`

---

## 💬 예시 PR 제목 모음

```
#42/feat: 유저 정보 편집 기능 추가 
#53/fix: 다크모드 토글 오류 수정
#60/docs: 커밋 메시지 규칙 문서 추가
#72/refactor: API 응답 처리 리팩토링
```

---
