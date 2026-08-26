import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * 스토리지/데이터 로더 회귀 테스트
 *
 * 빈 localStorage, 손상된 JSON, 부분 스키마, 빈 배열 응답 각각에서
 * getItem/loadQuizState/loadQuestions가 스키마 기본값으로 안전하게 복구되는지 검증한다.
 */

describe("storage/quizState 로더 방어적 정규화 회귀 테스트", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("빈 localStorage", () => {
    it("getItem은 키가 없을 때 defaultValue를 그대로 반환한다", async () => {
      const { getItem, DEFAULT_QUIZ_STATE } = await import("@/lib/storage");

      const result = getItem("quiz-state", DEFAULT_QUIZ_STATE);

      expect(result).toEqual(DEFAULT_QUIZ_STATE);
    });

    it("loadQuizState는 빈 storage에서도 completed=false와 빈 배열 필드를 반환한다", async () => {
      const { loadQuizState } = await import("@/lib/quizState");

      const state = loadQuizState();

      expect(state.completed).toBe(false);
      expect(state.dailyProgress).toEqual([]);
      expect(state.wrongAnswers).toEqual([]);
      expect(state.weeklyRecords).toEqual([]);
    });

    it("loadQuestions는 빈 storage에서도 기본 문제 목록을 반환한다", async () => {
      const { loadQuestions, DEFAULT_QUESTIONS } = await import("@/lib/quizState");

      const questions = loadQuestions();

      expect(questions).toEqual(DEFAULT_QUESTIONS);
      expect(questions.length).toBeGreaterThan(0);
    });
  });

  describe("손상된 JSON", () => {
    it("getItem은 파싱 불가능한 문자열에서 console.error 없이 defaultValue로 복구한다", async () => {
      const { getItem, DEFAULT_QUIZ_STATE } = await import("@/lib/storage");
      const consoleErrorSpy = vi.spyOn(console, "error");

      localStorage.setItem("quiz-state", "{not valid json");
      const result = getItem("quiz-state", DEFAULT_QUIZ_STATE);

      expect(result).toEqual(DEFAULT_QUIZ_STATE);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it("loadQuestions는 손상된 JSON을 기본 문제 목록으로 복구한다", async () => {
      const { loadQuestions, DEFAULT_QUESTIONS } = await import("@/lib/quizState");

      localStorage.setItem("questions", "not json at all");
      const questions = loadQuestions();

      expect(questions).toEqual(DEFAULT_QUESTIONS);
    });
  });

  describe("부분 스키마", () => {
    it("getItem은 일부 필드만 있는 객체를 defaultValue와 병합해 누락 필드를 채운다", async () => {
      const { getItem, DEFAULT_QUIZ_STATE } = await import("@/lib/storage");

      localStorage.setItem("quiz-state", JSON.stringify({ completed: true }));
      const result = getItem("quiz-state", DEFAULT_QUIZ_STATE);

      expect(result.completed).toBe(true);
      expect(Array.isArray(result.dailyProgress)).toBe(true);
      expect(Array.isArray(result.wrongAnswers)).toBe(true);
      expect(Array.isArray(result.weeklyRecords)).toBe(true);
    });

    it("getItem은 배열이어야 할 필드가 null/문자열/숫자로 저장돼도 항상 배열로 강제한다", async () => {
      const { getItem, DEFAULT_QUIZ_STATE } = await import("@/lib/storage");

      localStorage.setItem(
        "quiz-state",
        JSON.stringify({ completed: false, dailyProgress: null, wrongAnswers: "broken", weeklyRecords: 42 })
      );
      const result = getItem("quiz-state", DEFAULT_QUIZ_STATE);

      expect(result.dailyProgress).toEqual([]);
      expect(result.wrongAnswers).toEqual([]);
      expect(result.weeklyRecords).toEqual([]);
    });
  });

  describe("빈 배열 응답", () => {
    it("loadQuestions는 저장된 값이 빈 배열이면 빈 배열을 그대로 반환한다(기본값으로 대체하지 않음)", async () => {
      const { loadQuestions } = await import("@/lib/quizState");

      localStorage.setItem("questions", "[]");
      const questions = loadQuestions();

      expect(Array.isArray(questions)).toBe(true);
      expect(questions).toEqual([]);
    });

    it("getItem은 저장된 wrongAnswers가 빈 배열이면 빈 배열을 유지한다", async () => {
      const { getItem, DEFAULT_QUIZ_STATE } = await import("@/lib/storage");

      localStorage.setItem("quiz-state", JSON.stringify({ ...DEFAULT_QUIZ_STATE, wrongAnswers: [] }));
      const result = getItem("quiz-state", DEFAULT_QUIZ_STATE);

      expect(result.wrongAnswers).toEqual([]);
    });
  });
});
