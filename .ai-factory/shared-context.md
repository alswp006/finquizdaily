# Shared Context (auto-generated — do NOT modify)


## Shared Types Contract (IMPORT these, do NOT redefine)
```typescript
// 도메인 타입 — 모든 화면/로직은 여기서 import한다 (재정의 금지)

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  question: string;
  options: QuestionOption[];
  explanation?: string;
}

export interface DailyProgress {
  date: string;
  count: number;
  correctCount: number;
}

export interface WrongAnswer {
  questionId: string;
  date: string;
  selectedOptionId: string;
}

export interface WeeklyRecord {
  week: number;
  count: number;
}

// 저장소에서 읽은 값은 손상·부분 스키마일 수 있어 컬렉션 필드를 optional로 둔다.
// getItem()이 런타임에 항상 배열로 정규화해 채운다 — src/lib/storage.ts 참조.
export interface QuizState {
  completed: boolean;
  dailyProgress?: DailyProgress[];
  wrongAnswers?: WrongAnswer[];
  weeklyRecords?: WeeklyRecord[];
}

```

## Existing Codebase (import and use these — do NOT recreate)
### File Tree (src/)
  components/
    EmptyState.tsx
  data/
    questions.json
  lib/
    quizState.ts
    storage.ts
    types.ts
  pages/
    QuizPage.tsx
    RankingPage.tsx
    ResultPage.tsx
    WrongNotePage.tsx

### Exports (src/lib/)
- quizState.ts: export function loadQuizState(): Required<QuizState>; export function loadQuestions(): Question[]
- storage.ts: export const DEFAULT_QUIZ_STATE: QuizState =; export const DEFAULT_QUESTIONS: Question[] = questionsData as Question[]; export function getItem<T>(key: string, defaultValue: T): Required<T>; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void
- types.ts: export interface QuestionOption; export interface Question; export interface DailyProgress; export interface WrongAnswer; export interface WeeklyRecord; export interface QuizState

### Components (src/components/)
- EmptyState.tsx: EmptyState

### Module Dependencies (import graph)
  lib/quizState.ts → imports: lib/types, lib/storage
  lib/storage.ts → imports: lib/types, data/questions.json
  pages/QuizPage.tsx → imports: lib/quizState, lib/storage, components/EmptyState, lib/types
  pages/RankingPage.tsx → imports: components/EmptyState, lib/quizState, lib/types
  pages/ResultPage.tsx → imports: components/EmptyState, lib/quizState
  pages/WrongNotePage.tsx → imports: components/EmptyState, lib/quizState
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- heal-1-01: 스토리지/데이터 로더 방어적 정규화 (files: src/lib/storage.ts, src/lib/quizState.ts, src/data/questions.json)
- heal-1-02: 화면 렌더 경로 옵셔널 가드 추가 (files: src/pages/QuizPage.tsx, src/pages/ResultPage.tsx, src/pages/WrongNotePage.tsx, src/pages/RankingPage.tsx, src/components/EmptyState.tsx)

## Available exports from existing files
// src/components/EmptyState.tsx
export default function EmptyState({

// src/lib/quizState.ts
export { DEFAULT_QUIZ_STATE, DEFAULT_QUESTIONS };
export function loadQuizState(): Required<QuizState> {
export function loadQuestions(): Question[] {

// src/lib/storage.ts
export const DEFAULT_QUIZ_STATE: QuizState = {
export const DEFAULT_QUESTIONS: Question[] = questionsData as Question[];
export function getItem<T>(key: string, defaultValue: T): Required<T> {
export function setItem<T>(key: string, value: T): void {
export function removeItem(key: string): void {

// src/lib/types.ts
export interface QuestionOption {
export interface Question {
export interface DailyProgress {
export interface WrongAnswer {
export interface WeeklyRecord {
export interface QuizState {

## Memory Index (자동 학습 — 힌트로만 사용, 실제 코드 확인 필수)

Available topics: general(8)

Key lessons (verify against actual code before applying):
- [general] 의존 그래프 최하층의 타입·계약 파일은 런타임 코드 0줄의 순수 선언으로 가장 먼저 단독 타입체크를 통과시키고, 파일 생성은 셸 명령이 아닌 허용된 편집 도구로만 하게 강제하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 영속 저장소에서 읽은 값은 항상 스키마 기본값으로 정규화해 배열·객체 타입을 보장한 뒤 반환하고, 화면은 빈/손상/부분 데이터에서도 렌더되도록 방어하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 정책·기능 제거형 리팩터링은 화면과 도메인 로직 레이어에서만 수행하고, package.json의 플랫폼 필수 의존성(디자인 시스템·플랫폼 SDK·프레임워크 코어)은 어떤 경우에도 삭제하지 말 것 — 필수 패키지 화이트리스트를 빌드 전 가드로 검증하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 공용 기반 모듈(상수·저장소·계산 유틸)이 실제로 머지되기 전에는 이를 import하는 화면·훅 패킷을 머지하지 말고, 모든 머지 게이트에 타입체크와 프로덕션 빌드 통과(미해결 import 0건)를 필수로 걸어라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 라우팅·Provider·전역 레이아웃 같은 단일 통합 배선 책임은 하나의 워크패킷에만 할당하고, 다른 패킷은 그 위에 페이지 내부 요소만 얹도록 경계를 명확히 나눠라. (60% · 타 앱 1회 — 맹신 금지)