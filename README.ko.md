🇰🇷 [English](./README.md)

# FinQuiz Daily — 일일 금융 리터러시 퀴즈 미니앱

일일 금융 지식 테스트를 위한 가벼운 퀴즈 애플리케이션입니다. 사용자는 매일 새로운 퀴즈 세트를 풀고, 결과를 추적하며, 틀린 문제를 복습하고, 주간 순위표에서 경쟁할 수 있습니다. 오프라인 우선 로컬 저장소와 반응형 상태 관리를 갖춘 토스 미니앱으로 제작되었습니다.

## 기능

- 📝 **일일 퀴즈 세션** — 매일 3개의 무작위 문제 (24시간 내 동일한 세트)
- ✅ **즉시 결과** — 완료 후 즉시 점수 표시
- 📚 **오답 복습** — 모든 오답 기록 및 타임스탬프와 함께 조회
- 🏆 **주간 순위표** — 로컬 및 원격 순위 모드 (API 준비 완료)
- 💾 **지속 상태 저장** — 방어적 정규화를 통한 오프라인 우선 저장소

## 기술 스택

- **프론트엔드 프레임워크:** React 18 + React Router 7.5
- **빌드 도구:** Vite 6.3
- **디자인 시스템:** Toss Design System (TDS) Mobile + AIT
- **스타일링:** Emotion (CSS-in-JS)
- **타입 시스템:** TypeScript 5.8
- **상태 관리:** React hooks + localStorage
- **테스트:** Vitest + Playwright 시각 회귀
- **대상 플랫폼:** Android 7+, iOS 16+

## 시작하기

### 요구사항
- Node.js 16+ (npm)

### 의존성 설치
```bash
npm install
```

### 개발 서버
```bash
npm run dev
```
`http://localhost:5173`에서 Vite 개발 서버 시작

### 프로덕션 빌드
```bash
npm run build
```

### 테스트 실행
```bash
# 단위 테스트 및 통합 테스트
npm run test

# 감시 모드
npm run test:watch

# 시각 회귀 테스트 (Playwright)
npm run test:visual
npm run test:visual:update  # 스냅샷 업데이트
```

### 타입 검사
```bash
npm run typecheck
```

### 프로덕션 빌드 검증
```bash
npm run verify:build
```

## 환경 변수

| 변수 | 설명 | 필수 |
|------|------|------|
| `VITE_APP_NAME` | 토스 콘솔에 등록된 미니앱 이름 | Yes (빌드 시) |

## 프로젝트 구조

```
src/
├── pages/              # 라우트 페이지 컴포넌트
│   ├── QuizPage.tsx   # 일일 퀴즈 인터페이스
│   ├── ResultPage.tsx # 점수 표시
│   ├── WrongNotePage.tsx # 오답 복습
│   └── RankingPage.tsx    # 주간 순위표
├── components/        # 공유 UI 컴포넌트
│   └── EmptyState.tsx # 빈 상태 폴백 UI
├── lib/              # 비즈니스 로직 & 유틸리티
│   ├── types.ts      # 공유 TypeScript 인터페이스
│   ├── quizState.ts  # 퀴즈 상태 & 데이터 조회
│   ├── storage.ts    # localStorage 래퍼
│   ├── contract.ts   # 데이터 계약
│   └── date.ts       # 날짜 포매팅 유틸리티
├── __tests__/        # 테스트 스위트
├── App.tsx           # 라우트 정의
└── main.tsx          # 진입점 (수정 금지)
```

## 배포

이 앱은 토스 미니앱 플랫폼 배포를 사용합니다. 빌드 출력은 토스 CDN에 정적 CSR 전용 애플리케이션으로 호스팅됩니다.

1. `apps-in-toss.config.ts`의 appName이 토스 콘솔 등록과 일치하는지 확인
2. `npm run build`를 실행하여 `/dist` 생성
3. 유효한 `package.json` 및 `vite.config.ts`와 함께 저장소에 푸시
4. 토스 CI/CD 파이프라인이 배포를 자동으로 처리

**참고:** 동적 SSR은 지원되지 않습니다. 클라이언트 측 렌더링 (CSR) 및 정적 생성 (SSG)만 가능합니다.

## 라이선스

MIT
