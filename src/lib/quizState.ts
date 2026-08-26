import type { Question, QuizState } from "@/lib/types";
import type { QuizResult } from "@/lib/contract";
import { getItem, DEFAULT_QUIZ_STATE, DEFAULT_QUESTIONS } from "@/lib/storage";

const QUIZ_STATE_KEY = "quiz-state";
const QUESTIONS_KEY = "questions";

export { DEFAULT_QUIZ_STATE, DEFAULT_QUESTIONS };

export function loadQuizState(): Required<QuizState> {
  return getItem(QUIZ_STATE_KEY, DEFAULT_QUIZ_STATE);
}

export function loadQuestions(): Question[] {
  return getItem(QUESTIONS_KEY, DEFAULT_QUESTIONS);
}

/**
 * 날짜 문자열을 해시해 questions 배열에서 안정적으로 최대 3문항을 뽑는다.
 * 같은 날짜에는 항상 같은 3문항이 나온다(하루치 데일리 퀴즈 고정).
 */
export function getDailyQuestions(questions: Question[], date: string = new Date().toISOString().slice(0, 10)): Question[] {
  if (!Array.isArray(questions) || questions.length === 0) return [];

  const hash = date.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const startIdx = hash % Math.max(1, questions.length - 2);

  return questions.slice(startIdx, startIdx + 3);
}

/**
 * 주어진 날짜에 풀 수 있는 데일리 퀴즈 문항이 있는지 확인한다.
 * 저장된 questions가 비어 있거나 손상됐을 때 화면이 EmptyState를 띄울지 판단하는 데 쓴다.
 */
export function isQuizAvailable(date: string): boolean {
  return getDailyQuestions(loadQuestions(), date).length > 0;
}

/**
 * 완료된 퀴즈 결과 배열에서 정답률(0~100, 정수)을 계산한다. 결과가 없으면 0을 반환한다.
 */
export function calculateAccuracy(results: QuizResult[]): number {
  if (!Array.isArray(results) || results.length === 0) return 0;

  const correctCount = results.filter((result) => result.isCorrect).length;
  return Math.round((correctCount / results.length) * 100);
}
