import type { Question, QuizState } from "@/lib/types";
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
