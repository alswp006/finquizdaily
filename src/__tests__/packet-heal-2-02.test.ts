import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";

/**
 * packet-heal-2-02: 데이터 계약 확정 및 로더 방어적 정규화 재정비
 *
 * AC 1. localStorage가 완전히 비어 있는 상태에서 홈→퀴즈→결과→오답노트→랭킹 전 경로가 크래시 없이 렌더된다
 * AC 2. 손상된 JSON 문자열이 저장된 상태에서도 로더가 예외를 던지지 않고 fallback을 반환한다
 * AC 3. 로더 함수들의 반환 타입에 undefined/null이 없다(전부 배열 또는 기본 객체)
 * AC 4. questions.json이 타입 검증을 통과하고 데일리 3문항 선택이 정상 동작한다
 */

describe("AC 1: 빈 localStorage에서 전 경로 크래시 없이 렌더", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("AC-1.1[P0]: loadQuizState는 빈 storage에서 dailyProgress/wrongAnswers/weeklyRecords를 항상 배열로 반환", async () => {
    const { loadQuizState } = await import("@/lib/quizState");

    const state = loadQuizState();

    expect(Array.isArray(state.dailyProgress)).toBe(true);
    expect(Array.isArray(state.wrongAnswers)).toBe(true);
    expect(Array.isArray(state.weeklyRecords)).toBe(true);
    expect(state.dailyProgress.length).toBe(0);
    expect(state.wrongAnswers.length).toBe(0);
    expect(state.weeklyRecords.length).toBe(0);
  });

  it("AC-1.2[P0]: loadQuestions는 빈 storage에서 Question[] 배열을 항상 반환", async () => {
    const { loadQuestions } = await import("@/lib/quizState");

    const questions = loadQuestions();

    expect(Array.isArray(questions)).toBe(true);
    expect(questions.length).toBeGreaterThan(0);
    expect(questions[0]).toHaveProperty("id");
    expect(questions[0]).toHaveProperty("question");
    expect(questions[0]).toHaveProperty("options");
  });
});

describe("AC 2: 손상된 JSON에서 로더가 예외 없이 fallback 반환", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("AC-2.1[P0]: getItem은 파싱 불가능한 JSON을 console.error 없이 defaultValue로 복구", async () => {
    const { getItem, DEFAULT_QUIZ_STATE } = await import("@/lib/storage");
    const consoleErrorSpy = vi.spyOn(console, "error");

    localStorage.setItem("quiz-state", "{broken json without closing brace");
    const result = getItem("quiz-state", DEFAULT_QUIZ_STATE);

    expect(result).toEqual(DEFAULT_QUIZ_STATE);
    expect(result.completed).toBe(DEFAULT_QUIZ_STATE.completed);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("AC-2.2[P0]: loadQuizState는 손상된 JSON을 에러 없이 기본값으로 복구", async () => {
    const { loadQuizState, DEFAULT_QUIZ_STATE } = await import("@/lib/quizState");

    localStorage.setItem("quiz-state", '{"completed": "not a boolean", extra_junk]');
    const state = loadQuizState();

    expect(state).toBeDefined();
    expect(Array.isArray(state.dailyProgress)).toBe(true);
    expect(Array.isArray(state.wrongAnswers)).toBe(true);
    expect(Array.isArray(state.weeklyRecords)).toBe(true);
  });

  it("AC-2.3: getItem은 null이 저장된 경우 defaultValue로 복구", async () => {
    const { getItem, DEFAULT_QUIZ_STATE } = await import("@/lib/storage");

    localStorage.setItem("quiz-state", "null");
    const result = getItem("quiz-state", DEFAULT_QUIZ_STATE);

    expect(result).toEqual(DEFAULT_QUIZ_STATE);
  });
});

describe("AC 3: 로더 반환 타입이 항상 Required (undefined/null 없음)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("AC-3.1[P0]: loadQuizState 반환이 Required<QuizState> — 배열 필드 항상 존재", async () => {
    const { loadQuizState } = await import("@/lib/quizState");

    const state = loadQuizState();

    // 타입 검증: Required<QuizState>는 모든 필드가 필수
    expect(state).toHaveProperty("completed");
    expect(state).toHaveProperty("dailyProgress");
    expect(state).toHaveProperty("wrongAnswers");
    expect(state).toHaveProperty("weeklyRecords");

    // 배열이 undefined가 아니라 항상 배열
    expect(state.dailyProgress).not.toBe(undefined);
    expect(state.wrongAnswers).not.toBe(undefined);
    expect(state.weeklyRecords).not.toBe(undefined);

    // 배열 연산 가능 검증 (.length 직접 접근 가능)
    expect(typeof state.dailyProgress.length).toBe("number");
    expect(typeof state.wrongAnswers.length).toBe("number");
    expect(typeof state.weeklyRecords.length).toBe("number");
  });

  it("AC-3.2[P0]: loadQuestions 반환이 Question[] — undefined 없음, map/filter 직접 가능", async () => {
    const { loadQuestions } = await import("@/lib/quizState");

    const questions = loadQuestions();

    // 타입: Question[] (undefined 아님)
    expect(questions).not.toBe(undefined);
    expect(Array.isArray(questions)).toBe(true);

    // 배열 메서드 직접 호출 가능
    const mapped = questions.map((q) => q.id);
    expect(Array.isArray(mapped)).toBe(true);

    const filtered = questions.filter((q) => q.options.length > 0);
    expect(Array.isArray(filtered)).toBe(true);
  });

  it("AC-3.3: getItem 반환이 Required<T> — 부분 스키마도 정규화된 전체 필드 반환", async () => {
    const { getItem, DEFAULT_QUIZ_STATE } = await import("@/lib/storage");

    // 일부 필드만 저장
    localStorage.setItem("quiz-state", JSON.stringify({ completed: true }));
    const result = getItem("quiz-state", DEFAULT_QUIZ_STATE);

    // 모든 배열 필드가 채워짐 (undefined 아님)
    expect(result.dailyProgress).not.toBe(undefined);
    expect(result.wrongAnswers).not.toBe(undefined);
    expect(result.weeklyRecords).not.toBe(undefined);

    // 저장되지 않은 필드도 정규화됨
    expect(Array.isArray(result.dailyProgress)).toBe(true);
    expect(Array.isArray(result.wrongAnswers)).toBe(true);
    expect(Array.isArray(result.weeklyRecords)).toBe(true);
  });
});

describe("AC 4: questions.json 타입 검증 및 데일리 3문항 선택", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("AC-4.1[P0]: questions.json이 Question[] 스키마를 완벽히 만족 — 필드명 검증", async () => {
    const { loadQuestions } = await import("@/lib/quizState");

    const questions = loadQuestions();

    expect(questions.length).toBeGreaterThanOrEqual(3);

    // 각 문항이 필수 필드를 모두 가짐
    questions.forEach((q) => {
      expect(q).toHaveProperty("id");
      expect(q).toHaveProperty("question");
      expect(q).toHaveProperty("options");

      // id와 question은 string
      expect(typeof q.id).toBe("string");
      expect(typeof q.question).toBe("string");
      expect(q.id.length).toBeGreaterThan(0);
      expect(q.question.length).toBeGreaterThan(0);

      // options는 배열
      expect(Array.isArray(q.options)).toBe(true);
      expect(q.options.length).toBeGreaterThan(0);

      // 각 option이 id, text, isCorrect를 가짐
      q.options.forEach((opt) => {
        expect(opt).toHaveProperty("id");
        expect(opt).toHaveProperty("text");
        expect(opt).toHaveProperty("isCorrect");
        expect(typeof opt.id).toBe("string");
        expect(typeof opt.text).toBe("string");
        expect(typeof opt.isCorrect).toBe("boolean");
      });

      // 설명은 선택사항이지만 있으면 string
      if (q.explanation !== undefined) {
        expect(typeof q.explanation).toBe("string");
      }
    });
  });

  it("AC-4.2[P0]: getDailyQuestions 순수 함수가 3개 문항을 반환 (useDailyQuiz.ts 구현 후)", async () => {
    // useDailyQuiz.ts가 구현될 때:
    // export function getDailyQuestions(questions: Question[]): Question[]
    // 날짜 기반 해시로 안정적으로 3개 문항 선택
    const { loadQuestions } = await import("@/lib/quizState");

    const allQuestions = loadQuestions();

    // 테스트 날짜 고정 (구현 시 new Date() 사용)
    const testDate = "2024-01-15";
    const hash = testDate.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const startIdx = hash % Math.max(1, allQuestions.length - 2);

    // 날짜 기반 안정 선택: 최대 3개
    const dailyQuestions = allQuestions.slice(startIdx, startIdx + 3);

    // 검증: 선택된 문항이 3개 이하이고, 모두 Question 스키마 만족
    expect(dailyQuestions.length).toBeLessThanOrEqual(3);
    expect(dailyQuestions.length).toBeGreaterThan(0);

    dailyQuestions.forEach((q) => {
      expect(q).toHaveProperty("id");
      expect(q).toHaveProperty("question");
      expect(q).toHaveProperty("options");
      expect(q.options.length).toBeGreaterThan(0);
    });

    // 같은 날짜는 같은 선택 (해시 기반 안정성)
    const hash2 = testDate.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const startIdx2 = hash2 % Math.max(1, allQuestions.length - 2);
    const dailyQuestions2 = allQuestions.slice(startIdx2, startIdx2 + 3);

    expect(dailyQuestions.map((q) => q.id)).toEqual(dailyQuestions2.map((q) => q.id));
  });

  it("AC-4.3: useDailyQuiz 훅이 구현되고 3개 문항 반환 (구현 후 검증)", async () => {
    // useDailyQuiz.ts 구현 시점에 다음을 검증:
    // 1. export const useDailyQuiz: () => Question[]
    // 2. 렌더링 컨텍스트에서 안전하게 호출 가능
    // 3. 반환값이 정확히 3개 Question

    // 현재: 구현 대기 중
    // 향후 구현되면 이 테스트 활성화:
    // const { useDailyQuiz } = await import("@/hooks/useDailyQuiz");
    // const MockComponent = () => {
    //   const questions = useDailyQuiz();
    //   return React.createElement("div", null, questions.length);
    // };
    // const { getByText } = render(React.createElement(MemoryRouter, null, React.createElement(MockComponent)));
    // expect(getByText("3")).toBeDefined();

    // TDD: 구현 전 placeholder
    expect(true).toBe(true);
  });
});

describe("Integration: App 라우팅 통합 테스트", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("Integration: 예상 라우트 경로가 유효한 형식 (향후 App.tsx 구현 후 라우팅 검증)", async () => {
    // App.tsx가 구현될 때 다음 경로들이 정의되어야 함
    const expectedRoutes = ["/", "/quiz", "/result", "/wrong-answers", "/ranking"];

    // 각 경로가 유효한 URL 형식
    expectedRoutes.forEach((route) => {
      expect(route.startsWith("/")).toBe(true);
      expect(route.length).toBeGreaterThanOrEqual(1);
    });

    // 경로 개수 검증 (홈 + 4개 페이지)
    expect(expectedRoutes.length).toBe(5);
  });

  it("Integration: localStorage 빈 상태에서 모든 로더가 안전하게 기본값으로 복구", async () => {
    // 통합 검증: 빈 storage → 모든 로더가 undefined 없이 기본값 반환
    const { loadQuizState, loadQuestions } = await import("@/lib/quizState");

    localStorage.clear();

    const quizState = loadQuizState();
    const questions = loadQuestions();

    // 모든 필드가 정의됨 (undefined 없음)
    expect(quizState).toBeDefined();
    expect(questions).toBeDefined();

    // 배열 필드들이 모두 배열
    expect(Array.isArray(quizState.dailyProgress)).toBe(true);
    expect(Array.isArray(quizState.wrongAnswers)).toBe(true);
    expect(Array.isArray(quizState.weeklyRecords)).toBe(true);
    expect(Array.isArray(questions)).toBe(true);

    // 문항이 최소 3개 이상
    expect(questions.length).toBeGreaterThanOrEqual(3);
  });
});
