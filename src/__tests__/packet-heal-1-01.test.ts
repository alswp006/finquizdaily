import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * 스토리지/데이터 로더 방어적 정규화 패킷 테스트
 *
 * AC-1: localStorage가 완전히 비어 있는 상태에서 앱을 처음 열어도 크래시 없이 홈이 렌더된다
 * AC-2: 저장값이 손상된 JSON이거나 필드가 일부 누락된 객체여도 기본값으로 복구되고 console.error가 0건
 * AC-3: 모든 컬렉션 반환값은 undefined/null이 아닌 배열임이 타입과 런타임 모두에서 보장됨
 */

describe("스토리지/데이터 로더 방어적 정규화", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ============================================================================
  // AC-1: 빈 localStorage에서 기본값 반환, 앱 렌더링
  // ============================================================================
  describe("AC-1: 빈 localStorage에서 크래시 없음", () => {
    it("should return default quiz state when storage is empty", async () => {
      // storage.ts: getItem("quiz-state", DEFAULT_QUIZ_STATE)
      const { getItem, DEFAULT_QUIZ_STATE } = await import("@/lib/storage");

      const result = getItem("quiz-state", DEFAULT_QUIZ_STATE);

      // 기본값이 반환됨
      expect(result).toEqual(DEFAULT_QUIZ_STATE);
      // 필드들이 정의됨
      expect(result).toHaveProperty("completed");
      expect(result).toHaveProperty("dailyProgress");
      expect(result).toHaveProperty("wrongAnswers");
      expect(result).toHaveProperty("weeklyRecords");
    });

    it("should return default quiz state when getItem called with undefined localStorage value", async () => {
      const { getItem, DEFAULT_QUIZ_STATE } = await import("@/lib/storage");

      // localStorage에 없는 키
      const result = getItem("quiz-state", DEFAULT_QUIZ_STATE);

      expect(result).toBeDefined();
      expect(result).toEqual(DEFAULT_QUIZ_STATE);
      expect(result.completed).toBe(DEFAULT_QUIZ_STATE.completed);
    });

    it("should load questions with default when storage is empty", async () => {
      const { loadQuestions, DEFAULT_QUESTIONS } = await import("@/lib/quizState");

      const result = loadQuestions();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result).toEqual(DEFAULT_QUESTIONS);
    });
  });

  // ============================================================================
  // AC-2: 손상된 데이터, 필드 누락, console.error 0건
  // ============================================================================
  describe("AC-2: 손상된 데이터 및 부분 스키마 복구", () => {
    it("should recover from corrupted JSON with no console error", async () => {
      const { getItem, DEFAULT_QUIZ_STATE } = await import("@/lib/storage");

      // 손상된 JSON 저장
      localStorage.setItem("quiz-state", "{invalid json");

      const consoleErrorSpy = vi.spyOn(console, "error");

      const result = getItem("quiz-state", DEFAULT_QUIZ_STATE);

      // 기본값으로 복구되고 console.error 없음
      expect(result).toEqual(DEFAULT_QUIZ_STATE);
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("should handle null and undefined in storage", async () => {
      const { getItem, DEFAULT_QUIZ_STATE } = await import("@/lib/storage");

      // null을 JSON 문자열로 저장
      localStorage.setItem("quiz-state", "null");

      const result = getItem("quiz-state", DEFAULT_QUIZ_STATE);

      expect(result).toEqual(DEFAULT_QUIZ_STATE);
      expect(result.completed).toBeDefined();
    });

    it("should merge partial schema with defaults (missing fields)", async () => {
      const { getItem, DEFAULT_QUIZ_STATE } = await import("@/lib/storage");

      // 일부 필드만 저장 (completed 필드만 있고, 나머지 없음)
      const partial = { completed: true };
      localStorage.setItem("quiz-state", JSON.stringify(partial));

      const result = getItem("quiz-state", DEFAULT_QUIZ_STATE);

      // 저장된 값은 유지, 누락된 필드는 기본값으로 채워짐
      expect(result.completed).toBe(true);
      expect(result.dailyProgress).toBeDefined();
      expect(result.wrongAnswers).toBeDefined();
      expect(result.weeklyRecords).toBeDefined();
      expect(result.dailyProgress).toEqual(DEFAULT_QUIZ_STATE.dailyProgress);
      expect(result.wrongAnswers).toEqual(DEFAULT_QUIZ_STATE.wrongAnswers);
    });

    it("should override defaults with saved values (complete schema)", async () => {
      const { getItem, DEFAULT_QUIZ_STATE } = await import("@/lib/storage");

      // 완전한 스키마 저장
      const saved = {
        ...DEFAULT_QUIZ_STATE,
        completed: true,
      };
      localStorage.setItem("quiz-state", JSON.stringify(saved));

      const result = getItem("quiz-state", DEFAULT_QUIZ_STATE);

      expect(result.completed).toBe(true);
      expect(result).toEqual(saved);
    });

    it("should handle setItem and roundtrip correctly", async () => {
      const { getItem, setItem, DEFAULT_QUIZ_STATE } = await import("@/lib/storage");

      const updated = { ...DEFAULT_QUIZ_STATE, completed: true };
      setItem("quiz-state", updated);

      const result = getItem("quiz-state", DEFAULT_QUIZ_STATE);

      expect(result.completed).toBe(true);
      expect(result).toEqual(updated);
    });
  });

  // ============================================================================
  // AC-3: 컬렉션 필드는 항상 배열 (Array.isArray 보장)
  // ============================================================================
  describe("AC-3: 컬렉션 필드는 항상 배열", () => {
    it("should enforce dailyProgress as array when null is stored", async () => {
      const { getItem, DEFAULT_QUIZ_STATE } = await import("@/lib/storage");

      // dailyProgress를 null로 저장 (잘못된 데이터)
      const invalid = {
        ...DEFAULT_QUIZ_STATE,
        dailyProgress: null,
      };
      localStorage.setItem("quiz-state", JSON.stringify(invalid));

      const result = getItem("quiz-state", DEFAULT_QUIZ_STATE);

      expect(Array.isArray(result.dailyProgress)).toBe(true);
      expect(result.dailyProgress).toEqual([]);
    });

    it("should enforce wrongAnswers as array when undefined is stored", async () => {
      const { getItem, DEFAULT_QUIZ_STATE } = await import("@/lib/storage");

      // wrongAnswers를 undefined로 저장 (누락)
      const invalid = { ...DEFAULT_QUIZ_STATE };
      delete invalid.wrongAnswers;
      localStorage.setItem("quiz-state", JSON.stringify(invalid));

      const result = getItem("quiz-state", DEFAULT_QUIZ_STATE);

      expect(Array.isArray(result.wrongAnswers)).toBe(true);
      expect(result.wrongAnswers).not.toBeNull();
      expect(result.wrongAnswers).not.toBeUndefined();
    });

    it("should enforce weeklyRecords as array and preserve valid data", async () => {
      const { getItem, DEFAULT_QUIZ_STATE } = await import("@/lib/storage");

      // 유효한 배열 데이터
      const validData = {
        ...DEFAULT_QUIZ_STATE,
        weeklyRecords: [{ week: 1, count: 10 }],
      };
      localStorage.setItem("quiz-state", JSON.stringify(validData));

      const result = getItem("quiz-state", DEFAULT_QUIZ_STATE);

      expect(Array.isArray(result.weeklyRecords)).toBe(true);
      expect(result.weeklyRecords.length).toBe(1);
      expect(result.weeklyRecords[0]).toEqual({ week: 1, count: 10 });
    });

    it("should convert non-array collection to empty array", async () => {
      const { getItem, DEFAULT_QUIZ_STATE } = await import("@/lib/storage");

      // dailyProgress를 문자열로 저장 (타입 오류)
      const invalid = {
        ...DEFAULT_QUIZ_STATE,
        dailyProgress: "not an array",
      };
      localStorage.setItem("quiz-state", JSON.stringify(invalid));

      const result = getItem("quiz-state", DEFAULT_QUIZ_STATE);

      expect(Array.isArray(result.dailyProgress)).toBe(true);
      expect(result.dailyProgress).toEqual([]);
    });

    it("should not return undefined or null for any collection field", async () => {
      const { getItem, DEFAULT_QUIZ_STATE } = await import("@/lib/storage");

      const invalid = {
        completed: false,
        dailyProgress: null,
        wrongAnswers: undefined,
        weeklyRecords: "invalid",
      };
      localStorage.setItem("quiz-state", JSON.stringify(invalid));

      const result = getItem("quiz-state", DEFAULT_QUIZ_STATE);

      expect(result.dailyProgress).not.toBeNull();
      expect(result.dailyProgress).not.toBeUndefined();
      expect(result.wrongAnswers).not.toBeNull();
      expect(result.wrongAnswers).not.toBeUndefined();
      expect(result.weeklyRecords).not.toBeNull();
      expect(result.weeklyRecords).not.toBeUndefined();

      expect(Array.isArray(result.dailyProgress)).toBe(true);
      expect(Array.isArray(result.wrongAnswers)).toBe(true);
      expect(Array.isArray(result.weeklyRecords)).toBe(true);
    });
  });

  // ============================================================================
  // Additional edge cases
  // ============================================================================
  describe("Edge cases and additional robustness", () => {
    it("should handle empty string in storage", async () => {
      const { getItem, DEFAULT_QUIZ_STATE } = await import("@/lib/storage");

      localStorage.setItem("quiz-state", "");

      const consoleErrorSpy = vi.spyOn(console, "error");
      const result = getItem("quiz-state", DEFAULT_QUIZ_STATE);

      expect(result).toEqual(DEFAULT_QUIZ_STATE);
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("should handle deeply nested invalid structure", async () => {
      const { getItem, DEFAULT_QUIZ_STATE } = await import("@/lib/storage");

      const invalid = {
        completed: true,
        dailyProgress: { nested: { invalid: true } }, // should be array
        wrongAnswers: 42, // should be array
      };
      localStorage.setItem("quiz-state", JSON.stringify(invalid));

      const result = getItem("quiz-state", DEFAULT_QUIZ_STATE);

      expect(Array.isArray(result.dailyProgress)).toBe(true);
      expect(Array.isArray(result.wrongAnswers)).toBe(true);
    });

    it("should have exported DEFAULT_* constants", async () => {
      const { DEFAULT_QUIZ_STATE, DEFAULT_QUESTIONS } = await import("@/lib/storage");

      expect(DEFAULT_QUIZ_STATE).toBeDefined();
      expect(DEFAULT_QUESTIONS).toBeDefined();
      expect(Array.isArray(DEFAULT_QUESTIONS)).toBe(true);
    });

    it("should support removeItem", async () => {
      const { setItem, getItem, removeItem, DEFAULT_QUIZ_STATE } = await import("@/lib/storage");

      const data = { ...DEFAULT_QUIZ_STATE, completed: true };
      setItem("quiz-state", data);

      removeItem("quiz-state");

      const result = getItem("quiz-state", DEFAULT_QUIZ_STATE);
      expect(result).toEqual(DEFAULT_QUIZ_STATE);
      expect(result.completed).toBe(DEFAULT_QUIZ_STATE.completed);
    });

    it("loadQuizState should call getItem with correct defaults", async () => {
      const { loadQuizState } = await import("@/lib/quizState");

      const result = loadQuizState();

      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
      expect(result).toHaveProperty("completed");
      expect(result).toHaveProperty("dailyProgress");
      expect(result).toHaveProperty("wrongAnswers");
      expect(result).toHaveProperty("weeklyRecords");
    });
  });

  // ============================================================================
  // Type safety checks (compile-time, but also documented for runtime)
  // ============================================================================
  describe("Type safety and schema validation", () => {
    it("should preserve type information on returned objects", async () => {
      const { getItem, DEFAULT_QUIZ_STATE } = await import("@/lib/storage");

      const result = getItem("quiz-state", DEFAULT_QUIZ_STATE);

      // All collections should be arrays
      expect(typeof result.completed).toBe("boolean");
      expect(Array.isArray(result.dailyProgress)).toBe(true);
      expect(Array.isArray(result.wrongAnswers)).toBe(true);
      expect(Array.isArray(result.weeklyRecords)).toBe(true);
    });

    it("loadQuestions should return typed Question array", async () => {
      const { loadQuestions } = await import("@/lib/quizState");

      const questions = loadQuestions();

      expect(Array.isArray(questions)).toBe(true);
      if (questions.length > 0) {
        // Each question should have basic structure
        const q = questions[0];
        expect(q).toHaveProperty("id");
        expect(q).toHaveProperty("question");
        expect(q).toHaveProperty("options");
        expect(Array.isArray(q.options)).toBe(true);
      }
    });
  });
});
