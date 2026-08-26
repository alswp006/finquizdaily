# Shared Context (auto-generated — do NOT modify)


## 패킷 간 계약 (src/lib/contract.ts — 자동 생성, 수정 금지)
여기 선언된 이름·인자·반환 타입은 확정이다. 기반 패킷은 이대로 구현하고,
화면 패킷은 이대로 호출하라. 다르게 만들지 마라.

```typescript
/**
 * 패킷 간 인터페이스 계약 — 자동 생성. **수정하지 마라.**
 *
 * 기반 패킷은 여기 선언된 모양 그대로 구현하고, 화면 패킷은 여기 적힌 이름·인자·반환
 * 타입을 그대로 가정해도 된다. 추측이 어긋나 병합에서 무너지는 것을 막기 위한 파일이다.
 */

/** 일일 퀴즈의 기본 엔티티. questions.json 로더와 화면 렌더링에서 모두 필요 (구현: 패킷 heal-2-02) */
export type Quiz = { id: string; question: string; options: string[]; correctAnswer: number; category: string; difficulty: 'easy' | 'medium' | 'hard'; explanations: { [key: number]: string } };

/** 사용자의 일일 퀴즈 진행 상태. 저장/로드 및 화면 렌더링에서 공유 (구현: 패킷 heal-1-01) */
export type QuizState = { userId?: string; date: string; currentQuizId: string; selectedAnswer?: number; isAnswered: boolean; isCorrect?: boolean; completedAt?: string };

/** 완료된 퀴즈 결과. 결과 페이지와 랭킹 페이지에서 사용 (구현: 패킷 heal-1-01) */
export type QuizResult = { quizId: string; date: string; selectedAnswer: number; correctAnswer: number; isCorrect: boolean; category: string; difficulty: string; completedAt: string };

/** 주어진 날짜의 퀴즈 데이터를 questions.json에서 로드. heal-1-02의 QuizPage에서 호출 (구현: 패킷 heal-1-01) */
export type loadDailyQuizFn = (date?: string) => Promise<Quiz>;

/** 사용자의 일일 퀴즈 진행 상태를 저장소에서 로드 (구현: 패킷 heal-1-01) */
export type loadUserQuizStateFn = (userId: string, date: string) => Promise<QuizState | null>;

/** 사용자의 퀴즈 상태를 저장소에 저장 (구현: 패킷 heal-1-01) */
export type saveUserQuizStateFn = (userId: string, state: QuizState) => Promise<void>;

/** 사용자의 완료된 퀴즈 히스토리 조회. ResultPage, WrongNotePage, RankingPage에서 사용 (구현: 패킷 heal-1-01) */
export type getUserQuizHistoryFn = (userId: string, limit?: number) => Promise<QuizResult[]>;

/** 퀴즈 로드, 상태 관리, 제출 로직을 통합한 커스텀 훅. heal-1-02의 모든 페이지에서 호출 (구현: 패킷 heal-2-02) */
export type useDailyQuizFn = (date?: string) => { quiz: Quiz | null; state: QuizState | null; isLoading: boolean; error: Error | null; submitAnswer: (answer: number) => Promise<void> };

/** 날짜를 UI 표시용 문자열로 포맷. 화면 렌더링에서 사용 (구현: 패킷 heal-2-01) */
export type formatDateFn = (date: string | Date) => string;

/** 오늘 날짜를 YYYY-MM-DD 형식의 문자열로 반환. 로더와 화면에서 기본값으로 사용 (구현: 패킷 heal-2-01) */
export type getTodayDateStringFn = () => string;

/** 주어진 날짜의 퀴즈가 존재하는지 확인. EmptyState 표시 여부 결정 (구현: 패킷 heal-2-02) */
export type isQuizAvailableFn = (date: string) => boolean;

/** 퀴즈 없음/오류 상태를 표시하는 공용 UI 컴포넌트. 여러 페이지에서 사용 (구현: 패킷 heal-1-02) */
export type EmptyStateFn = (props: { title: string; description: string; icon?: string }) => JSX.Element;

/** 퀴즈 결과 배열에서 정답률(0~100)을 계산. 랭킹 및 통계 페이지에서 사용 (구현: 패킷 heal-2-02) */
export type calculateAccuracyFn = (results: QuizResult[]) => number;

/** 사용자의 랭킹 통계 조회. RankingPage에서 사용 (구현: 패킷 heal-1-01) */
export type getRankingDataFn = (userId: string) => Promise<{ userId: string; accuracy: number; totalQuizzes: number; streakDays: number }>;

```

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
    __tests__/
    quizState.ts
    storage.ts
    types.ts
  pages/
    QuizPage.tsx
    RankingPage.tsx
    ResultPage.tsx
    WrongNotePage.tsx
    __tests__/

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
- heal-1-03: 에러 경로 회귀 테스트 및 빌드 검증 (files: src/lib/__tests__/storage.test.ts, src/pages/__tests__/screens.smoke.test.tsx, vite.config.ts)