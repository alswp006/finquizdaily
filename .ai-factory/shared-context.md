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