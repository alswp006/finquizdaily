import type { Question, QuizState } from "@/lib/types";
import questionsData from "@/data/questions.json";

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
