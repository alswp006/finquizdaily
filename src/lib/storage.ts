import type { Question, QuizState } from "@/lib/types";
import type { Quiz, QuizAnswerState, QuizResult } from "@/lib/contract";
import questionsData from "@/data/questions.json";
import { getTodayDateString, addDays } from "@/lib/date";

export const DEFAULT_QUIZ_STATE: QuizState = {
  completed: false,
  dailyProgress: [],
  wrongAnswers: [],
  weeklyRecords: [],
};

export const DEFAULT_QUESTIONS: Question[] = questionsData as Question[];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// defaultValue에서 배열이었던 필드는 병합 결과에서도 항상 배열이도록 강제한다.
function normalizeArrayFields(
  merged: Record<string, unknown>,
  defaultValue: Record<string, unknown>
): Record<string, unknown> {
  for (const key of Object.keys(defaultValue)) {
    if (Array.isArray(defaultValue[key]) && !Array.isArray(merged[key])) {
      merged[key] = defaultValue[key];
    }
  }
  return merged;
}

/**
 * localStorage에서 값을 읽어 방어적으로 정규화한다.
 * - JSON.parse 실패, null/undefined, 타입 불일치는 모두 defaultValue로 복구한다.
 * - 객체 기본값은 {...defaultValue, ...parsed}로 병합하고, 배열이어야 할 필드는 항상 배열로 강제한다.
 */
export function getItem<T>(key: string, defaultValue: T): Required<T> {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return defaultValue as Required<T>;

    const parsed: unknown = JSON.parse(stored);
    if (parsed === null || parsed === undefined) return defaultValue as Required<T>;

    if (Array.isArray(defaultValue)) {
      return (Array.isArray(parsed) ? parsed : defaultValue) as unknown as Required<T>;
    }

    if (isPlainObject(defaultValue) && isPlainObject(parsed)) {
      const merged = { ...defaultValue, ...parsed };
      return normalizeArrayFields(merged, defaultValue) as Required<T>;
    }

    return (typeof parsed === typeof defaultValue ? parsed : defaultValue) as Required<T>;
  } catch {
    return defaultValue as Required<T>;
  }
}

export function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장 공간 부족 등은 무시하고 다음 세션도 기본값으로 계속 동작한다.
  }
}

export function removeItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

// "questions" 저장 키는 src/lib/quizState.ts의 QUESTIONS_KEY와 같은 값이어야 한다 —
// 순환 참조(storage.ts ↔ quizState.ts)를 피하려고 여기서 별도로 상수를 둔다.
const QUESTIONS_STORAGE_KEY = "questions";
const USER_QUIZ_STATE_PREFIX = "quiz-answer-state";

type QuestionRow = Question & { category?: string; difficulty?: Quiz["difficulty"] };

function loadQuestionRows(): QuestionRow[] {
  return getItem(QUESTIONS_STORAGE_KEY, DEFAULT_QUESTIONS) as QuestionRow[];
}

function toQuiz(row: QuestionRow): Quiz {
  const options = row.options.map((option) => option.text);
  const correctAnswer = row.options.findIndex((option) => option.isCorrect);
  const explanations: { [key: number]: string } = {};
  if (row.explanation) {
    options.forEach((_, index) => {
      explanations[index] = row.explanation as string;
    });
  }

  return {
    id: row.id,
    question: row.question,
    options,
    correctAnswer,
    category: row.category ?? "금융상식",
    difficulty: row.difficulty ?? "medium",
    explanations,
  };
}

function hashDate(date: string): number {
  return date.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

/** 주어진 날짜의 데일리 퀴즈 한 문항을 로드한다. 같은 날짜는 항상 같은 문항을 반환한다. */
export async function loadDailyQuiz(date: string = getTodayDateString()): Promise<Quiz> {
  const rows = loadQuestionRows();
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`${date}에 출제할 문제가 없어요`);
  }

  const index = hashDate(date) % rows.length;
  return toQuiz(rows[index]);
}

function userQuizStateKey(userId: string, date: string): string {
  return `${USER_QUIZ_STATE_PREFIX}:${userId}:${date}`;
}

function isQuizAnswerState(value: unknown): value is QuizAnswerState {
  return (
    isPlainObject(value) &&
    typeof value.date === "string" &&
    typeof value.currentQuizId === "string" &&
    typeof value.isAnswered === "boolean"
  );
}

/** 사용자의 특정 날짜 퀴즈 진행 상태를 로드한다. 저장된 값이 없거나 손상됐으면 null. */
export async function loadUserQuizState(userId: string, date: string): Promise<QuizAnswerState | null> {
  try {
    const stored = localStorage.getItem(userQuizStateKey(userId, date));
    if (!stored) return null;

    const parsed: unknown = JSON.parse(stored);
    return isQuizAnswerState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** 사용자의 퀴즈 진행 상태를 저장한다. 히스토리·랭킹 조회는 이 저장소를 다시 훑어 계산한다. */
export async function saveUserQuizState(userId: string, state: QuizAnswerState): Promise<void> {
  setItem(userQuizStateKey(userId, state.date), state);
}

function listUserQuizStates(userId: string): QuizAnswerState[] {
  const prefix = `${USER_QUIZ_STATE_PREFIX}:${userId}:`;
  const states: QuizAnswerState[] = [];

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(prefix)) continue;

      const stored = localStorage.getItem(key);
      if (!stored) continue;

      try {
        const parsed: unknown = JSON.parse(stored);
        if (isQuizAnswerState(parsed) && parsed.isAnswered) {
          states.push(parsed);
        }
      } catch {
        // 손상된 항목은 건너뛰고 계속 스캔한다.
      }
    }
  } catch {
    return [];
  }

  return states;
}

/** 사용자가 완료한 퀴즈 결과 히스토리를 최신순으로 조회한다. limit이 있으면 그 개수만큼만. */
export async function getUserQuizHistory(userId: string, limit?: number): Promise<QuizResult[]> {
  const rows = loadQuestionRows();
  const states = listUserQuizStates(userId).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const results: QuizResult[] = [];
  for (const state of states) {
    if (state.selectedAnswer === undefined) continue;

    const row = rows.find((candidate) => candidate.id === state.currentQuizId);
    if (!row) continue;

    const correctAnswer = row.options.findIndex((option) => option.isCorrect);
    results.push({
      quizId: state.currentQuizId,
      date: state.date,
      selectedAnswer: state.selectedAnswer,
      correctAnswer,
      isCorrect: state.isCorrect ?? state.selectedAnswer === correctAnswer,
      category: row.category ?? "금융상식",
      difficulty: row.difficulty ?? "medium",
      completedAt: state.completedAt ?? state.date,
    });
  }

  return typeof limit === "number" ? results.slice(0, limit) : results;
}

function calculateStreakDays(dates: string[]): number {
  const uniqueDates = new Set(dates);
  let streak = 0;
  let cursor = getTodayDateString();

  while (uniqueDates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

/** 사용자의 정답률·완료 문항 수·연속 출석일을 계산한다. RankingPage에서 사용. */
export async function getRankingData(
  userId: string
): Promise<{ userId: string; accuracy: number; totalQuizzes: number; streakDays: number }> {
  const history = await getUserQuizHistory(userId);
  const totalQuizzes = history.length;
  const correctCount = history.filter((result) => result.isCorrect).length;
  const accuracy = totalQuizzes === 0 ? 0 : Math.round((correctCount / totalQuizzes) * 100);
  const streakDays = calculateStreakDays(history.map((result) => result.date));

  return { userId, accuracy, totalQuizzes, streakDays };
}
