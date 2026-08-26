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

/** 문항 구조 (구현: 패킷 0001) */
export type Question = { id: string; text: string; options: string[]; correct: number; explanation: string };

/** 에러 분류 (구현: 패킷 0002) */
export type ErrorCode =
  | "NETWORK_TIMEOUT"
  | "INVALID_SCHEMA"
  | "RANK_API_FAILED"
  | "STORAGE_CORRUPTED"
  | "E_SCHEMA_INVALID"
  | "E_NOT_FOUND"
  | "E_VALIDATION"
  | "E_CONFLICT_DUPLICATE"
  | "E_LIMIT_EXCEEDED"
  | "E_SERVER"
  | "E_TYPE_MISMATCH"
  | "E_UNAUTHENTICATED"
  | "E_FORBIDDEN";

/** 에러 표준화 (구현: 패킷 0002) */
export type AppError = { code: ErrorCode; message: string; httpStatus?: number; field?: string; timestamp: string };

/** 문항 조회 (구현: 패킷 0003) */
export type getQuestionFn = (questionId: string) => Question | null;

/** 랭킹 항목 (구현: 패킷 0001) */
export type LeaderboardEntry = { rank: number; userId: string; score: number; weekKey: string };

/** 오답 기록 (구현: 패킷 0001) */
export type WrongAnswerNote = { id: string; questionId: string; userAnswer: number; correctAnswer: number; createdDate: string; reviewed: boolean };

/** 일일 세션 상태 (구현: 패킷 0001) */
export type DailySessionState = { dateKey: string; questionIds: string[]; answers: (number|null)[]; submittedAt?: string };

/** 사용자 진도 (구현: 패킷 0001) */
export type UserProgress = { totalScore: number; streakDays: number; badgesUnlocked: string[]; lastQuizDate: string };

/** API 호출 (타임아웃·재시도) (구현: 패킷 0006) */
export type apiFetchFn = <T>(url: string, opts?: { timeout?: number; retries?: number; signal?: AbortSignal }) => Promise<T>;

/** HTTP 상태→앱 에러 변환 (구현: 패킷 0006) */
export type mapHttpErrorFn = (statusCode: number) => ErrorCode;

/** KST 기준 오늘 날짜키 (YYYY-MM-DD) (구현: 패킷 0007) */
export type getTodayDateKeyFn = () => string;

/** 주차키 (YYYY-Www) (구현: 패킷 0007) */
export type getWeekKeyFn = (date?: Date) => string;

/** 점수 범위 강제 [0, 100] (구현: 패킷 0007) */
export type clampScoreFn = (score: number) => number;

/** 점수 서버 제출 (구현: 패킷 0008) */
export type submitScoreFn = (score: number, weekKey: string, streak: number) => Promise<{ rank: number; total: number }>;

/** 주간 랭킹 조회 (구현: 패킷 0008) */
export type fetchLeaderboardFn = (weekKey: string) => Promise<LeaderboardEntry[]>;

/** 일일 문항 결정론적 선택 (구현: 패킷 0010) */
export type getDailyQuestionsFn = (dateKey: string) => Question[];

/** 세션 저장 (구현: 패킷 0010) */
export type saveDailySessionFn = (session: DailySessionState) => void;

/** 현재 진도 조회 (구현: 패킷 0011) */
export type getProgressFn = () => UserProgress;

/** 점수 기록 (스트릭·뱃지 자동 관리) (구현: 패킷 0011) */
export type recordScoreFn = (score: number, dateKey: string) => void;

/** 오답 저장 (구현: 패킷 0009) */
export type addWrongAnswerFn = (question: Question, userAnswer: number, correctAnswer: number) => void;

```

## Shared Types Contract (IMPORT these, do NOT redefine)
```typescript
// Domain types — pure declarations only, no runtime code.

export interface AppError {
  code: string;
  message: string;
  statusCode?: number;
  timestamp?: string;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: AppError };

export interface Question {
  id: string;
  category: string;
  text: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
  deepExplanation: string;
}

export interface Note {
  questionId: string;
  status: "todo" | "done";
  reviewedAt: number | null;
  createdAt: number;
}

export interface DailySession {
  dateKey: string;
  answers: number[];
  score: number;
  status: "in_progress" | "completed";
}

export type Badge =
  | "first_quiz"
  | "streak_3"
  | "streak_7"
  | "streak_30"
  | "perfect_score"
  | "note_master"
  | "rank_top10";

export interface Profile {
  userKey: string;
  nickname: string;
  totalScore: number;
  streak: number;
  lastCompletedDateKey: string | null;
  badges: Badge[];
  noteDoneCount: number;
}

export interface Flags {
  rankOptIn: boolean;
  rankDisabledReason: string | null;
  lastShareAt: number | null;
  deepExplainUnlockedDateKey: string | null;
}

export interface DeepExplainState {
  questionId: string;
  unlocked: boolean;
  content: string | null;
}

export interface RankEntry {
  rank: number;
  nickname: string;
  score: number;
  isMe?: boolean;
}

export interface RankCache {
  weekKey: string;
  entries: RankEntry[];
  fetchedAt: number;
}

export type RouteState = {
  "/": undefined;
  "/daily": undefined;
  "/daily/result": { dateKey: string } | undefined;
  "/notes": undefined;
  "/notes/:questionId": undefined;
  "/rank": undefined;
  "/share": { dateKey: string } | undefined;
};

```

## Existing Codebase (import and use these — do NOT recreate)
### File Tree (src/)
  App.tsx
  components/
    AdSlot.tsx
    Amount.tsx
    BottomCTA.tsx
    Card.tsx
    CountUp.tsx
    FloatingTabBar.tsx
    MiniBar.tsx
    PageShell.tsx
    ScreenScaffold.tsx
    Sparkline.tsx
    StateView.tsx
    SummaryHero.tsx
    TossPurchase.tsx
    TossRewardAd.tsx
  data/
    questionBank.ts
  hooks/
  lib/
    contract.ts
    errorCatalog.ts
    fqd-storage.ts
    storage.ts
    types.ts
    utils.ts
  main.tsx
  pages/
    Home.tsx
    __TdsGallery.tsx
  styles/
    globals.css
    reward-ad.css
  types/
  vite-env.d.ts

### Exports (src/lib/)
- contract.ts: export type Question =; export type ErrorCode = | "NETWORK_TIMEOUT" | "INVALID_SCHEMA" | "RANK_API_FAILED" | "STORAGE_CORRUPTED" | "E_SCHEMA_INV; export type AppError =; export type getQuestionFn = (questionId: string) => Question | null; export type LeaderboardEntry =; export type WrongAnswerNote =; export type DailySessionState =; export type UserProgress =
- errorCatalog.ts: export const ERROR_CATALOG =; export type ErrorCode = keyof typeof ERROR_CATALOG; export type AppError =
- fqd-storage.ts: export const KEYS =; export function readArray<T>(key: string, defaultValue: T[]): T[]; export function readObject( key: string, defaultValue: Record<string, unknown> ): Record<string, unknown>; export function readObject<T extends Record<string, unknown>>( key: string, defaultValue: T ): T; export function readObject<T extends Record<string, unknown>>( key: string, defaultValue: T ): T; export function write<T>(key: string, value: T): boolean; export function remove(key: string): void
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void
- types.ts: export interface AppError; export type Result<T> =; export interface Question; export interface Note; export interface DailySession; export type Badge = | "first_quiz" | "streak_3" | "streak_7" | "streak_30" | "perfect_score" | "note_master" | "rank_top; export interface Profile; export interface Flags
- utils.ts: export function cn(...classes: (string | boolean | undefined | null)[]): string; export function formatNumber(n: number): string; export function formatCurrency(n: number, currency = 'KRW'): string

### Components (src/components/)
- AdSlot.tsx: AdSlot
- Amount.tsx: Amount
- BottomCTA.tsx: SubmitFooter, ButtonStack
- Card.tsx: Card
- CountUp.tsx: CountUp
- FloatingTabBar.tsx: FloatingTabBar
- MiniBar.tsx: MiniBar
- PageShell.tsx: PageShell
- ScreenScaffold.tsx: ScreenScaffold
- Sparkline.tsx: Sparkline
- StateView.tsx: EmptyState, LoadingState
- SummaryHero.tsx: SummaryHero
- TossPurchase.tsx: TossPurchase
- TossRewardAd.tsx: TossRewardAd
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0001: 도메인 타입 + RouteState 정의 (files: src/lib/types.ts)
- 0002: Error Catalog + AppError 타입 (files: src/lib/errorCatalog.ts)
- 0003: 문항 은행 시드 데이터 + getQuestion 조회 (files: src/data/questionBank.ts)
- 0004: fqd:v1 localStorage 네임스페이스 헬퍼 + 자가복구 (files: src/lib/storage.ts)