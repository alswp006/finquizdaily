import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import fs from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/**
 * 화면 렌더 경로 옵셔널 가드 추가 패킷 테스트
 *
 * AC-1: 오답노트·랭킹 데이터가 0건일 때 빈 상태 UI가 표시되고 예외가 발생하지 않는다
 * AC-2: 문항 인덱스가 범위를 벗어나도 흰 화면/크래시 대신 안전한 조기 반환이 동작한다
 * AC-3: 랭킹 API 미설정 또는 실패 시 로컬 모드로 폴백하고 console.error가 0건이다
 * AC-4: HEX 하드코딩 0건, window.open/location.href 0건
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
      get: (_target, prop) => stub(String(prop)),
    }
  );
});

vi.mock("@toss/tds-colors", () => {
  return new Proxy(
    {},
    {
      get: (_target, prop) => `mock-color-${String(prop)}`,
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
      get: (_target, prop) => stub(String(prop)),
    }
  );
});

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual("react-router-dom")),
  useNavigate: () => mockNavigate,
}));

function renderAt(ui: React.ReactElement, initialEntry: { pathname: string; state?: unknown }) {
  return render(
    React.createElement(MemoryRouter, { initialEntries: [initialEntry] }, ui)
  );
}

const SRC_DIRS = [path.resolve(__dirname, "../pages"), path.resolve(__dirname, "../components")];

function collectSourceFiles(): string[] {
  const files: string[] = [];
  for (const dir of SRC_DIRS) {
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir)) {
      if (entry.endsWith(".tsx") || entry.endsWith(".ts")) {
        files.push(path.join(dir, entry));
      }
    }
  }
  return files;
}

describe("화면 렌더 경로 옵셔널 가드 추가", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // AC-1: 오답노트·랭킹 데이터 0건 → 빈 상태 UI, 예외 없음
  // ==========================================================================
  describe("AC-1: 데이터 0건일 때 빈 상태", () => {
    it("AC-1[P0]: WrongNotePage should render empty state when there are no wrong answers, without throwing", async () => {
      const { setItem, DEFAULT_QUIZ_STATE } = await import("@/lib/storage");
      setItem("quiz-state", { ...DEFAULT_QUIZ_STATE, wrongAnswers: [] });

      const { default: WrongNotePage } = await import("@/pages/WrongNotePage");

      expect(() => renderAt(React.createElement(WrongNotePage), { pathname: "/wrong-note" })).not.toThrow();

      const empty = screen.getByTestId("wrong-note-empty");
      expect(empty).toBeInTheDocument();
      expect(screen.queryByTestId("wrong-note-item")).not.toBeInTheDocument();
    });

    it("AC-1[P0]: RankingPage should render empty state when there are no ranking records, without throwing", async () => {
      const { setItem, DEFAULT_QUIZ_STATE } = await import("@/lib/storage");
      setItem("quiz-state", { ...DEFAULT_QUIZ_STATE, weeklyRecords: [] });
      // fetch가 없는 환경(미설정)을 가정
      // @ts-expect-error jsdom 전역에 fetch를 지워 미설정 상태를 재현
      delete globalThis.fetch;

      const { default: RankingPage } = await import("@/pages/RankingPage");

      expect(() => renderAt(React.createElement(RankingPage), { pathname: "/ranking" })).not.toThrow();

      const empty = screen.getByTestId("ranking-empty");
      expect(empty).toBeInTheDocument();
      expect(screen.queryByTestId("ranking-item")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // AC-2: 문항 인덱스 범위 밖 → 안전한 조기 반환
  // ==========================================================================
  describe("AC-2: 문항 인덱스 범위 가드", () => {
    it("AC-2[P0]: QuizPage should render the current question when index is within range", async () => {
      const { default: QuizPage } = await import("@/pages/QuizPage");

      renderAt(React.createElement(QuizPage), { pathname: "/quiz", state: { index: 0 } });

      expect(screen.getByTestId("quiz-question")).toBeInTheDocument();
      expect(screen.queryByTestId("quiz-empty")).not.toBeInTheDocument();
    });

    it("AC-2[P0]: QuizPage should safely fall back instead of crashing when index is out of range", async () => {
      const { default: QuizPage } = await import("@/pages/QuizPage");

      expect(() =>
        renderAt(React.createElement(QuizPage), { pathname: "/quiz", state: { index: 999 } })
      ).not.toThrow();

      expect(screen.getByTestId("quiz-empty")).toBeInTheDocument();
      expect(screen.queryByTestId("quiz-question")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // AC-3: 랭킹 API 미설정/실패 → 로컬 모드 폴백, console.error 0건
  // ==========================================================================
  describe("AC-3: 랭킹 로컬 모드 폴백", () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it("AC-3[P0]: RankingPage should fall back to local mode with 0 console.error when the ranking API request fails", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("network down"));
      const consoleErrorSpy = vi.spyOn(console, "error");

      const { setItem, DEFAULT_QUIZ_STATE } = await import("@/lib/storage");
      setItem("quiz-state", {
        ...DEFAULT_QUIZ_STATE,
        weeklyRecords: [{ week: 1, count: 10 }],
      });

      const { default: RankingPage } = await import("@/pages/RankingPage");

      await expect(async () => {
        renderAt(React.createElement(RankingPage), { pathname: "/ranking" });
      }).not.toThrow();

      const local = await screen.findByTestId("ranking-local-mode");
      expect(local).toBeInTheDocument();
      expect(screen.getAllByTestId("ranking-item")).toHaveLength(1);
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("AC-3[P1]: RankingPage should fall back to local mode with 0 console.error when the ranking API is not configured", async () => {
      // @ts-expect-error 미설정(fetch 자체가 없는) 환경 재현
      delete globalThis.fetch;
      const consoleErrorSpy = vi.spyOn(console, "error");

      const { setItem, DEFAULT_QUIZ_STATE } = await import("@/lib/storage");
      setItem("quiz-state", {
        ...DEFAULT_QUIZ_STATE,
        weeklyRecords: [
          { week: 1, count: 10 },
          { week: 2, count: 20 },
        ],
      });

      const { default: RankingPage } = await import("@/pages/RankingPage");

      renderAt(React.createElement(RankingPage), { pathname: "/ranking" });

      const local = await screen.findByTestId("ranking-local-mode");
      expect(local).toBeInTheDocument();
      expect(screen.getAllByTestId("ranking-item")).toHaveLength(2);
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  // ==========================================================================
  // AC-4: 정적 검사 — HEX 하드코딩 금지, 외부 이탈(window.open/location.href) 금지
  // ==========================================================================
  describe("AC-4: 정적 코드 규칙 검사", () => {
    it("AC-4: should contain no hardcoded hex color literals in pages/components source", () => {
      const files = collectSourceFiles();
      expect(files.length).toBeGreaterThan(0);

      const violations: string[] = [];
      const hexPattern = /#[0-9a-fA-F]{3,8}\b/;
      for (const file of files) {
        const content = fs.readFileSync(file, "utf-8");
        if (hexPattern.test(content)) {
          violations.push(path.basename(file));
        }
      }

      expect(violations).toEqual([]);
    });

    it("AC-4: should contain no window.open or window.location.href navigation in pages/components source", () => {
      const files = collectSourceFiles();
      expect(files.length).toBeGreaterThan(0);

      const violations: string[] = [];
      const outlinkPattern = /window\.(open|location\.href)/;
      for (const file of files) {
        const content = fs.readFileSync(file, "utf-8");
        if (outlinkPattern.test(content)) {
          violations.push(path.basename(file));
        }
      }

      expect(violations).toEqual([]);
    });
  });
});
