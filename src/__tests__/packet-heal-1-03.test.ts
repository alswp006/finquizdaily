import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import fs from "node:fs";
import path from "node:path";
import { render, fireEvent, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/**
 * 에러 경로 회귀 테스트 및 빌드 검증 패킷 테스트
 *
 * AC-1: 빈/손상/부분 스토리지, 빈 배열 응답 3(+1)종 케이스에서 로더가 기본값을 반환한다
 * AC-2: 모든 화면이 데이터 없음/잘못된 입력(중복 제출·범위 밖 인덱스·정답 배열 불일치)에서도 예외 없이 렌더된다
 * AC-3: vite build가 es2019 타깃으로 설정되어 있고, 화면 플로우 1회 통과 시 console.error가 0건이다
 */

// @toss/tds-mobile은 jsdom에서 실제 렌더 시 충돌하므로 이름만 보존한 단순 스텁으로 대체한다.
vi.mock("@toss/tds-mobile", () => {
  const stub = (name: string) => {
    const Comp = ({ children, ...props }: Record<string, unknown>) =>
      React.createElement("div", { "data-tds": name, ...props }, children as React.ReactNode);
    Comp.displayName = name;
    return Comp;
  };
  return new Proxy(
    {},
    {
      // "then"을 함수로 돌려주면 이 Proxy가 thenable로 오인되어 await import(...)가 영원히 멈춘다 — 반드시 가드.
      get: (_target, prop) => (prop === "then" ? undefined : stub(String(prop))),
      // vitest가 mock 모듈을 감쌀 때 "prop in target"으로 export 존재 여부를 검사한다 — 항상 true를 돌려줘야 임의 컴포넌트명이 통과한다.
      has: () => true,
    }
  );
});

vi.mock("@toss/tds-colors", () => {
  return new Proxy(
    {},
    {
      get: (_target, prop) => (prop === "then" ? undefined : `mock-color-${String(prop)}`),
      has: () => true,
    }
  );
});

vi.mock("lucide-react", () => {
  const stub = (name: string) => {
    const Comp = (props: Record<string, unknown>) => React.createElement("svg", { "data-icon": name, ...props });
    Comp.displayName = name;
    return Comp;
  };
  return new Proxy(
    {},
    {
      get: (_target, prop) => (prop === "then" ? undefined : stub(String(prop))),
      has: () => true,
    }
  );
});

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual("react-router-dom")),
  useNavigate: () => mockNavigate,
}));

function renderAt(ui: React.ReactElement, initialEntry: { pathname: string; state?: unknown }) {
  return render(React.createElement(MemoryRouter, { initialEntries: [initialEntry] }, ui));
}

describe("에러 경로 회귀 테스트 및 빌드 검증", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // AC-1: 빈/손상/부분 스토리지 + 빈 배열 응답
  // ==========================================================================
  describe("AC-1: 스토리지 로더 방어적 정규화", () => {
    it("AC-1[P0]: loadQuizState와 loadQuestions는 완전히 빈 localStorage에서도 스키마 기본값을 반환한다", async () => {
      const { loadQuizState, loadQuestions, DEFAULT_QUESTIONS } = await import("@/lib/quizState");

      const state = loadQuizState();
      const questions = loadQuestions();

      expect(state.completed).toBe(false);
      expect(state.wrongAnswers).toEqual([]);
      expect(state.dailyProgress).toEqual([]);
      expect(state.weeklyRecords).toEqual([]);
      expect(questions).toEqual(DEFAULT_QUESTIONS);
      expect(questions.length).toBeGreaterThan(0);
    });

    it("AC-1[P0]: 손상된 JSON과 부분 스키마 quiz-state는 console.error 없이 기본값으로 복구되고, 빈 배열 응답인 questions는 빈 배열을 반환한다", async () => {
      const { getItem, DEFAULT_QUIZ_STATE } = await import("@/lib/storage");
      const consoleErrorSpy = vi.spyOn(console, "error");

      localStorage.setItem("quiz-state", "{not valid json");
      const corrupted = getItem("quiz-state", DEFAULT_QUIZ_STATE);
      expect(corrupted).toEqual(DEFAULT_QUIZ_STATE);
      expect(Array.isArray(corrupted.wrongAnswers)).toBe(true);

      localStorage.setItem("quiz-state", JSON.stringify({ completed: true }));
      const partial = getItem("quiz-state", DEFAULT_QUIZ_STATE);
      expect(partial.completed).toBe(true);
      expect(partial.wrongAnswers).toEqual([]);
      expect(partial.weeklyRecords).toEqual([]);

      localStorage.setItem("questions", "[]");
      const { loadQuestions } = await import("@/lib/quizState");
      const emptyQuestions = loadQuestions();
      expect(Array.isArray(emptyQuestions)).toBe(true);
      expect(emptyQuestions).toEqual([]);

      expect(consoleErrorSpy).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  // ==========================================================================
  // AC-2: 데이터 없음 렌더 스모크 + 잘못된 입력 시나리오
  // ==========================================================================
  describe("AC-2: 화면 렌더 안정성", () => {
    it("AC-2[P0]: 문제가 0건일 때 QuizPage와 ResultPage는 예외 없이 빈 상태를 렌더한다", async () => {
      localStorage.setItem("questions", "[]");

      const { default: QuizPage } = await import("@/pages/QuizPage");
      const quiz = renderAt(React.createElement(QuizPage), { pathname: "/quiz", state: { index: 0 } });
      expect(quiz.getByTestId("quiz-empty")).toBeInTheDocument();
      quiz.unmount();

      const { default: ResultPage } = await import("@/pages/ResultPage");
      const result = renderAt(React.createElement(ResultPage), { pathname: "/result" });
      expect(result.getByTestId("result-empty")).toBeInTheDocument();
      result.unmount();
    });

    it("AC-2[P0]: 기록이 0건일 때 WrongNotePage와 RankingPage는 예외 없이 빈 상태를 렌더한다", async () => {
      // @ts-expect-error jsdom 전역에서 fetch를 지워 랭킹 API 미설정 상태를 재현
      delete globalThis.fetch;

      const { default: WrongNotePage } = await import("@/pages/WrongNotePage");
      const wrongNote = renderAt(React.createElement(WrongNotePage), { pathname: "/wrong-note" });
      expect(wrongNote.getByTestId("wrong-note-empty")).toBeInTheDocument();
      wrongNote.unmount();

      const { default: RankingPage } = await import("@/pages/RankingPage");
      const ranking = renderAt(React.createElement(RankingPage), { pathname: "/ranking" });
      expect(await ranking.findByTestId("ranking-empty")).toBeInTheDocument();
      ranking.unmount();
    });

    it("AC-2: 다음 문제 버튼을 두 번 눌러도 오답이 중복 기록되지 않는다 (중복 제출 가드)", async () => {
      const { default: QuizPage } = await import("@/pages/QuizPage");
      const { loadQuizState } = await import("@/lib/quizState");

      const { container } = renderAt(React.createElement(QuizPage), { pathname: "/quiz", state: { index: 0 } });

      const optionRows = container.querySelectorAll('[data-tds="ListRow"]');
      expect(optionRows.length).toBe(3);
      fireEvent.click(optionRows[0]); // q1-a: 오답 ("3천만 원")

      const cta = container.querySelector('[data-tds="FixedBottomCTA"]');
      expect(cta).not.toBeNull();
      fireEvent.click(cta as Element);
      fireEvent.click(cta as Element);

      const state = loadQuizState();
      expect(state.wrongAnswers.length).toBe(1);
      expect(state.wrongAnswers[0].questionId).toBe("q1");
      expect(state.wrongAnswers[0].selectedOptionId).toBe("q1-a");
    });

    it("AC-2: 문항 인덱스가 음수로 범위를 벗어나도, 정답 기록의 선택지가 더 이상 존재하지 않아도 크래시하지 않는다", async () => {
      const { default: QuizPage } = await import("@/pages/QuizPage");
      const outOfRange = renderAt(React.createElement(QuizPage), { pathname: "/quiz", state: { index: -1 } });
      expect(outOfRange.getByTestId("quiz-empty")).toBeInTheDocument();
      expect(outOfRange.queryByTestId("quiz-question")).not.toBeInTheDocument();
      outOfRange.unmount();

      const { setItem, DEFAULT_QUIZ_STATE } = await import("@/lib/storage");
      setItem("quiz-state", {
        ...DEFAULT_QUIZ_STATE,
        wrongAnswers: [{ questionId: "q1", date: "2026-08-20", selectedOptionId: "q1-does-not-exist" }],
      });

      const { default: WrongNotePage } = await import("@/pages/WrongNotePage");
      expect(() =>
        renderAt(React.createElement(WrongNotePage), { pathname: "/wrong-note" })
      ).not.toThrow();

      expect(screen.getAllByTestId("wrong-note-item")).toHaveLength(1);
      expect(screen.queryByTestId("wrong-note-empty")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // AC-3: 빌드 타깃 및 전체 플로우 console.error 0건
  // ==========================================================================
  describe("AC-3: 빌드 설정과 플로우 콘솔 에러", () => {
    it("AC-3: vite.config.ts는 build.target을 es2019로 지정한다", () => {
      const configPath = path.resolve(__dirname, "../../vite.config.ts");
      const content = fs.readFileSync(configPath, "utf-8");

      expect(content).toMatch(/target\s*:\s*['"]es2019['"]/);
    });

    it("AC-3: 퀴즈 → 결과 → 오답노트 → 랭킹 화면을 순서대로 렌더해도 console.error가 0건이다", async () => {
      // @ts-expect-error 랭킹 API 미설정 상태를 재현해 로컬 모드로 결정적으로 폴백시킨다
      delete globalThis.fetch;
      const consoleErrorSpy = vi.spyOn(console, "error");

      const { setItem, DEFAULT_QUIZ_STATE } = await import("@/lib/storage");
      setItem("quiz-state", {
        ...DEFAULT_QUIZ_STATE,
        wrongAnswers: [{ questionId: "q1", date: "2026-08-20", selectedOptionId: "q1-a" }],
        weeklyRecords: [{ week: 1, count: 5 }],
      });

      const { default: QuizPage } = await import("@/pages/QuizPage");
      const quiz = renderAt(React.createElement(QuizPage), { pathname: "/quiz", state: { index: 1 } });
      quiz.unmount();

      const { default: ResultPage } = await import("@/pages/ResultPage");
      const result = renderAt(React.createElement(ResultPage), { pathname: "/result", state: { correctCount: 7 } });
      result.unmount();

      const { default: WrongNotePage } = await import("@/pages/WrongNotePage");
      const wrongNote = renderAt(React.createElement(WrongNotePage), { pathname: "/wrong-note" });
      wrongNote.unmount();

      const { default: RankingPage } = await import("@/pages/RankingPage");
      const ranking = renderAt(React.createElement(RankingPage), { pathname: "/ranking" });
      await ranking.findByTestId("ranking-local-mode");
      ranking.unmount();

      expect(consoleErrorSpy).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });
});
