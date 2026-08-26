import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/**
 * 화면 렌더 스모크 회귀 테스트
 *
 * 데이터가 전혀 없는 상태(빈 storage)에서 각 화면이 예외 없이 렌더되는지,
 * 그리고 잘못된 입력(범위 밖 인덱스·중복 제출·정답 배열 길이 불일치)에서도
 * 안전하게 동작하는지 검증한다.
 */

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
      get: (_target, prop) => (prop === "then" ? undefined : stub(String(prop))),
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

describe("화면 렌더 스모크 (데이터 없음)", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("QuizPage: 문제가 0건이면 예외 없이 빈 상태를 렌더한다", async () => {
    localStorage.setItem("questions", "[]");
    const { default: QuizPage } = await import("@/pages/QuizPage");

    expect(() =>
      renderAt(React.createElement(QuizPage), { pathname: "/quiz", state: { index: 0 } })
    ).not.toThrow();
    expect(screen.getByTestId("quiz-empty-state")).toBeInTheDocument();
  });

  it("ResultPage: 문제가 0건이면 예외 없이 빈 상태를 렌더한다", async () => {
    localStorage.setItem("questions", "[]");
    const { default: ResultPage } = await import("@/pages/ResultPage");

    expect(() => renderAt(React.createElement(ResultPage), { pathname: "/result" })).not.toThrow();
    expect(screen.getByTestId("result-empty")).toBeInTheDocument();
  });

  it("WrongNotePage: 오답 기록이 0건이면 예외 없이 빈 상태를 렌더한다", async () => {
    const { default: WrongNotePage } = await import("@/pages/WrongNotePage");

    expect(() => renderAt(React.createElement(WrongNotePage), { pathname: "/wrong-note" })).not.toThrow();
    expect(screen.getByTestId("wrong-note-empty")).toBeInTheDocument();
  });

  it("RankingPage: 랭킹 기록이 0건이면 예외 없이 빈 상태를 렌더한다", async () => {
    // @ts-expect-error 미설정 환경 재현
    delete globalThis.fetch;
    const { default: RankingPage } = await import("@/pages/RankingPage");

    expect(() => renderAt(React.createElement(RankingPage), { pathname: "/ranking" })).not.toThrow();
    expect(await screen.findByTestId("ranking-empty")).toBeInTheDocument();
  });

  it("QuizPage: 문항 인덱스가 범위를 벗어나면(양수/음수) 크래시 없이 빈 상태로 조기 반환한다", async () => {
    const { default: QuizPage } = await import("@/pages/QuizPage");

    const overRange = renderAt(React.createElement(QuizPage), { pathname: "/quiz", state: { index: 999 } });
    expect(overRange.getByTestId("quiz-empty")).toBeInTheDocument();
    overRange.unmount();

    const negative = renderAt(React.createElement(QuizPage), { pathname: "/quiz", state: { index: -1 } });
    expect(negative.getByTestId("quiz-empty")).toBeInTheDocument();
  });

  it("QuizPage: CTA를 연속 두 번 눌러도 오답이 중복 기록되지 않는다(중복 제출 가드)", async () => {
    const { default: QuizPage } = await import("@/pages/QuizPage");
    const { loadQuizState } = await import("@/lib/quizState");

    const { container } = renderAt(React.createElement(QuizPage), { pathname: "/quiz", state: { index: 0 } });

    const optionRows = container.querySelectorAll('[data-tds="ListRow"]');
    fireEvent.click(optionRows[0]);

    const cta = container.querySelector('[data-tds="FixedBottomCTA"]') as Element;
    fireEvent.click(cta);
    fireEvent.click(cta);
    fireEvent.click(cta);

    expect(loadQuizState().wrongAnswers.length).toBe(1);
  });

  it("WrongNotePage: 정답 배열 길이가 questions와 불일치(선택지가 사라짐)해도 크래시하지 않는다", async () => {
    const { setItem, DEFAULT_QUIZ_STATE } = await import("@/lib/storage");
    setItem("quiz-state", {
      ...DEFAULT_QUIZ_STATE,
      wrongAnswers: [{ questionId: "q1", date: "2026-08-20", selectedOptionId: "does-not-exist" }],
    });
    const { default: WrongNotePage } = await import("@/pages/WrongNotePage");

    expect(() =>
      renderAt(React.createElement(WrongNotePage), { pathname: "/wrong-note" })
    ).not.toThrow();
    expect(screen.getAllByTestId("wrong-note-item")).toHaveLength(1);
  });

  it("App: 루트('/') 진입 시 /quiz로 라우팅되고 크래시하지 않는다", async () => {
    const { default: App } = await import("@/App");

    expect(() => renderAt(React.createElement(App), { pathname: "/" })).not.toThrow();
    expect(screen.getByTestId("quiz-question")).toBeInTheDocument();
  });

  it("App: 정의되지 않은 경로는 /quiz로 폴백되고 크래시하지 않는다(막다른 길 방지)", async () => {
    const { default: App } = await import("@/App");

    expect(() => renderAt(React.createElement(App), { pathname: "/unknown-route" })).not.toThrow();
    expect(screen.getByTestId("quiz-question")).toBeInTheDocument();
  });
});
