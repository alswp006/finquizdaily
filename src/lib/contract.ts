/**
 * 패킷 간 인터페이스 계약 — 자동 생성. **수정하지 마라.**
 *
 * 기반 패킷은 여기 선언된 모양 그대로 구현하고, 화면 패킷은 여기 적힌 이름·인자·반환
 * 타입을 그대로 가정해도 된다. 추측이 어긋나 병합에서 무너지는 것을 막기 위한 파일이다.
 */

/** 일일 퀴즈의 기본 엔티티. questions.json 로더와 화면 렌더링에서 모두 필요 (구현: 패킷 heal-2-02) */
export type Quiz = { id: string; question: string; options: string[]; correctAnswer: number; category: string; difficulty: 'easy' | 'medium' | 'hard'; explanations: { [key: number]: string } };

/** 사용자의 일일 퀴즈 진행 상태(단건 제출 상태). 저장/로드 및 화면 렌더링에서 공유 (구현: 패킷 heal-1-01)
 * 이름 충돌 주의: src/lib/types.ts의 QuizState(집계 저장 상태)와는 다른 타입이다 — import 시 어느 쪽인지 명확히 구분할 것. */
export type QuizAnswerState = { userId?: string; date: string; currentQuizId: string; selectedAnswer?: number; isAnswered: boolean; isCorrect?: boolean; completedAt?: string };

/** 완료된 퀴즈 결과. 결과 페이지와 랭킹 페이지에서 사용 (구현: 패킷 heal-1-01) */
export type QuizResult = { quizId: string; date: string; selectedAnswer: number; correctAnswer: number; isCorrect: boolean; category: string; difficulty: string; completedAt: string };

/** 주어진 날짜의 퀴즈 데이터를 questions.json에서 로드. heal-1-02의 QuizPage에서 호출 (구현: 패킷 heal-1-01) */
export type loadDailyQuizFn = (date?: string) => Promise<Quiz>;

/** 사용자의 일일 퀴즈 진행 상태를 저장소에서 로드 (구현: 패킷 heal-1-01) */
export type loadUserQuizStateFn = (userId: string, date: string) => Promise<QuizAnswerState | null>;

/** 사용자의 퀴즈 상태를 저장소에 저장 (구현: 패킷 heal-1-01) */
export type saveUserQuizStateFn = (userId: string, state: QuizAnswerState) => Promise<void>;

/** 사용자의 완료된 퀴즈 히스토리 조회. ResultPage, WrongNotePage, RankingPage에서 사용 (구현: 패킷 heal-1-01) */
export type getUserQuizHistoryFn = (userId: string, limit?: number) => Promise<QuizResult[]>;

/** 퀴즈 로드, 상태 관리, 제출 로직을 통합한 커스텀 훅. heal-1-02의 모든 페이지에서 호출 (구현: 패킷 heal-2-02) */
export type useDailyQuizFn = (date?: string) => { quiz: Quiz | null; state: QuizAnswerState | null; isLoading: boolean; error: Error | null; submitAnswer: (answer: number) => Promise<void> };

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
