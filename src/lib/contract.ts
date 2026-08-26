/**
 * 패킷 간 인터페이스 계약 — 자동 생성. **수정하지 마라.**
 *
 * 기반 패킷은 여기 선언된 모양 그대로 구현하고, 화면 패킷은 여기 적힌 이름·인자·반환
 * 타입을 그대로 가정해도 된다. 추측이 어긋나 병합에서 무너지는 것을 막기 위한 파일이다.
 */

/** 문항 구조 (구현: 패킷 0001) */
export type Question = { id: string; text: string; options: string[]; correct: number; explanation: string };

/** 에러 표준화 (구현: 패킷 0002) */
export type AppError = { code: string; message: string; statusCode?: number; timestamp: string };

/** 에러 분류 (구현: 패킷 0002) */
export type ErrorCode = enum { NETWORK_TIMEOUT = "NETWORK_TIMEOUT"; INVALID_SCHEMA = "INVALID_SCHEMA"; RANK_API_FAILED = "RANK_API_FAILED"; STORAGE_CORRUPTED = "STORAGE_CORRUPTED" };

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
export type submitScoreFn = (score: number, weekKey: string) => Promise<{ rank: number; totalSubmitted: number }>;

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
