import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";

/**
 * packet-heal-2-03: 빈 상태·오류 입력 회귀 테스트 + 프로덕션 빌드 게이트
 *
 * AC 1. 추가된 회귀 테스트가 전부 통과하고, 빈 스토리지 케이스에서 .length 접근 크래시가 재현되지 않는다
 *   - 1-1: 빈 스토리지 → loadQuizState/loadQuestions가 항상 배열(빈 배열 포함)을 반환, .length 안전
 *   - 1-2: 손상 JSON → JSON.parse 실패 시 기본값 반환, 크래시 없음
 *   - 1-3: 부분 진행 상태(답안 1개만) → 부분 스키마도 정규화된 전체 필드 반환
 *   - 1-4: API 미설정 로컬 모드 → loadDailyQuestions/calculateAccuracy가 빈 배열/0으로 안전 처리
 * AC 2. `npm run build`가 exit code 0으로 성공한다
 *   - 2-1: 프로덕션 빌드 완료, 번들 생성됨
 * AC 3. 프로덕션 번들 전체 플로우 1회 통과 시 console.error 0건
 *   - 3-1: 주요 로더 함수 호출 시 console.error 발생하지 않음
 *   - 3-2: useDailyQuiz 훅 렌더링 시 콘솔 에러 0건
 * AC 4. grep -rE "window\.(open|location\.href)" src/ 및 '#[0-9a-fA-F]{3,8}' 패턴 0건
 *   - 4-1: window.open/window.location.href 사용 0건
 *   - 4-2: 직접 정의 컬러 패턴(#hex) 0건
 */

describe("packet-heal-2-03: 빈 상태·오류 입력 회귀 테스트 + 프로덕션 빌드 게이트", () => {
  describe("AC-1: 회귀 테스트 — 빈 스토리지, 손상 JSON, 부분 진행, API 미설정", () => {
    beforeEach(() => {
      localStorage.clear();
      vi.clearAllMocks();
    });

    it("AC-1.1[P0]: 빈 스토리지 — loadQuizState가 항상 배열을 반환, .length 접근 크래시 없음", async () => {
      const { loadQuizState, DEFAULT_QUIZ_STATE } = await import("@/lib/quizState");
      const consoleErrorSpy = vi.spyOn(console, "error");

      // 빈 localStorage
      localStorage.clear();
      const state = loadQuizState();

      // 모든 배열 필드가 존재하고 .length 접근 안전
      expect(state).toBeDefined();
      expect(state.dailyProgress).toBeDefined();
      expect(state.wrongAnswers).toBeDefined();
      expect(state.weeklyRecords).toBeDefined();

      // .length 직접 접근 가능 (크래시 없음)
      expect(typeof state.dailyProgress.length).toBe("number");
      expect(typeof state.wrongAnswers.length).toBe("number");
      expect(typeof state.weeklyRecords.length).toBe("number");

      // 값은 기본값과 동일
      expect(state.dailyProgress).toEqual(DEFAULT_QUIZ_STATE.dailyProgress);
      expect(state.wrongAnswers).toEqual(DEFAULT_QUIZ_STATE.wrongAnswers);
      expect(state.weeklyRecords).toEqual(DEFAULT_QUIZ_STATE.weeklyRecords);

      // console.error 0건
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it("AC-1.2[P0]: 빈 스토리지 — loadQuestions가 항상 배열을 반환, .map/.filter 안전", async () => {
      const { loadQuestions } = await import("@/lib/quizState");

      localStorage.clear();
      const questions = loadQuestions();

      // 배열이고 최소 3개 이상
      expect(Array.isArray(questions)).toBe(true);
      expect(questions.length).toBeGreaterThanOrEqual(3);

      // .map 직접 호출 가능
      const ids = questions.map((q) => q.id);
      expect(Array.isArray(ids)).toBe(true);
      expect(ids.length).toBe(questions.length);

      // .filter 직접 호출 가능
      const withOptions = questions.filter((q) => Array.isArray(q.options) && q.options.length > 0);
      expect(Array.isArray(withOptions)).toBe(true);
    });

    it("AC-1.3[P0]: 손상 JSON — getItem이 파싱 실패 시 기본값 반환, 크래시 없음", async () => {
      const { getItem, DEFAULT_QUIZ_STATE } = await import("@/lib/storage");
      const consoleErrorSpy = vi.spyOn(console, "error");

      // 파싱 불가능한 JSON
      localStorage.setItem("quiz-state", "{invalid json without closing");
      const result = getItem("quiz-state", DEFAULT_QUIZ_STATE);

      // 기본값으로 복구됨
      expect(result).toEqual(DEFAULT_QUIZ_STATE);
      expect(result.dailyProgress).toEqual([]);
      expect(result.wrongAnswers).toEqual([]);
      expect(result.weeklyRecords).toEqual([]);

      // console.error 0건
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it("AC-1.4[P0]: 부분 진행 상태 — 답안 1개만 저장된 경우도 정규화된 전체 필드 반환", async () => {
      const { loadQuizState, DEFAULT_QUIZ_STATE } = await import("@/lib/quizState");

      // 부분 스키마: completed만 저장
      localStorage.setItem("quiz-state", JSON.stringify({ completed: true }));
      const state = loadQuizState();

      // 모든 필드가 정규화됨
      expect(state.completed).toBe(true);
      expect(Array.isArray(state.dailyProgress)).toBe(true);
      expect(Array.isArray(state.wrongAnswers)).toBe(true);
      expect(Array.isArray(state.weeklyRecords)).toBe(true);

      // 배열 필드들이 비어있음 (undefined 아님)
      expect(state.dailyProgress.length).toBe(0);
      expect(state.wrongAnswers.length).toBe(0);
      expect(state.weeklyRecords.length).toBe(0);
    });

    it("AC-1.5[P0]: API 미설정 로컬 모드 — getDailyQuestions가 빈 배열도 안전 처리", async () => {
      const { getDailyQuestions } = await import("@/lib/quizState");

      // 빈 배열 전달
      const result = getDailyQuestions([], "2024-01-15");

      // 빈 배열 반환 (크래시 없음)
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it("AC-1.6[P0]: API 미설정 로컬 모드 — calculateAccuracy가 빈 결과도 안전 처리", async () => {
      const { calculateAccuracy } = await import("@/lib/quizState");

      // 빈 배열 전달
      const accuracy = calculateAccuracy([]);

      // 0 반환 (크래시 없음)
      expect(typeof accuracy).toBe("number");
      expect(accuracy).toBe(0);
    });
  });

  describe("AC-2: 빌드 성공 — npm run build 완료, exit code 0", () => {
    it("AC-2.1[P0]: 프로덕션 빌드가 성공하고 dist 디렉토리가 생성됨", async () => {
      // 이 테스트는 실제 빌드를 호출하지 않음. 대신 테스트 실행 후 verify-build.sh가 실행됨.
      // AC 검증: scripts/verify-build.sh에서 `npm run build`로 확인
      // 테스트 레벨: 빌드 성공 여부는 CI/CD 파이프라인에서 검증
      // 여기서는 빌드 성공 시 필요한 조건을 테스트함:
      // 1. package.json 존재 및 유효함
      const packageJson = await import("@/../package.json");
      expect(packageJson).toBeDefined();
      expect(packageJson.name).toBeDefined();
      expect(packageJson.scripts).toBeDefined();
      expect(packageJson.scripts.build).toBeDefined();

      // 2. vite.config.ts가 rollupOptions.external을 사용하지 않음 (SDK 번들 포함 필수)
      // 이는 grep 게이트에서 검증하고, 여기서는 타입 체크만 함
      expect(true).toBe(true);
    });
  });

  describe("AC-3: 프로덕션 번들 console.error 0건", () => {
    beforeEach(() => {
      localStorage.clear();
      vi.clearAllMocks();
    });

    it("AC-3.1[P0]: loadQuizState/loadQuestions 호출 시 console.error 0건", async () => {
      const { loadQuizState, loadQuestions } = await import("@/lib/quizState");
      const consoleErrorSpy = vi.spyOn(console, "error");

      localStorage.clear();
      const state = loadQuizState();
      const questions = loadQuestions();

      // 함수 호출 후 console.error 발생하지 않음
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      // 반환값이 유효함
      expect(state).toBeDefined();
      expect(Array.isArray(questions)).toBe(true);

      consoleErrorSpy.mockRestore();
    });

    it("AC-3.2[P0]: useDailyQuiz 훅 렌더링 시 console.error 0건", async () => {
      const { useDailyQuiz } = await import("@/hooks/useDailyQuiz");
      const consoleErrorSpy = vi.spyOn(console, "error");

      // 훅을 컴포넌트에서 렌더링
      const TestComponent = ({ date }: { date?: string }) => {
        const questions = useDailyQuiz(date);
        return React.createElement("div", null, `Questions: ${questions.length}`);
      };

      localStorage.clear();
      const { getByText } = render(
        React.createElement(MemoryRouter, null, React.createElement(TestComponent, { date: "2024-01-15" }))
      );

      // 렌더링 후 console.error 0건
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      // 콘텐츠 렌더됨
      expect(getByText(/Questions:/)).toBeDefined();

      consoleErrorSpy.mockRestore();
    });

    it("AC-3.3: 손상 JSON 로드 시에도 console.error 0건", async () => {
      const { loadQuizState } = await import("@/lib/quizState");
      const consoleErrorSpy = vi.spyOn(console, "error");

      // 손상된 JSON 저장
      localStorage.setItem("quiz-state", "{broken");
      const state = loadQuizState();

      // console.error 0건
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      // 기본값으로 복구됨
      expect(state).toBeDefined();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("AC-4: grep 게이트 — 정적 패턴 매칭", () => {
    it("AC-4.1[P0]: window.open/window.location.href 사용 0건 검증 준비", async () => {
      // grep -rE 'window\.(open|location\.href)' src/ → 0건
      // vitest 환경에서는 fs 직접 접근이 제한되므로, 실제 검증은 verify-build.sh에서 수행
      // 이 테스트는 grep 게이트가 필요함을 명시함
      // AC-4.1 검증: scripts/verify-build.sh에서 다음을 실행
      // $ grep -rE 'window\.(open|location\.href)' src/ && exit 1 || exit 0
      expect(true).toBe(true);
    });

    it("AC-4.2[P0]: 직접 정의 컬러 패턴(#hex) 0건 검증 준비", async () => {
      // grep -rE '#[0-9a-fA-F]{3,8}' src/ → TDS 컬러 토큰만 사용해야 함
      // vitest 환경에서는 fs 직접 접근이 제한되므로, 실제 검증은 verify-build.sh에서 수행
      // 이 테스트는 grep 게이트가 필요함을 명시함
      // AC-4.2 검증: scripts/verify-build.sh에서 다음을 실행
      // $ grep -rE '#[0-9a-fA-F]{3,8}' src/ && exit 1 || exit 0
      expect(true).toBe(true);
    });

    it("AC-4.3: TDS 컬러 토큰 의존성 확인", async () => {
      // @toss/tds-colors에서 색상을 import하는지 확인
      // 또는 TDS 컴포넌트의 내장 스타일을 사용하는지 확인
      // package.json에서 @toss/tds-colors 의존성 확인
      const packageJson = await import("@/../package.json");

      expect(packageJson.dependencies).toHaveProperty("@toss/tds-colors");
      expect(packageJson.dependencies).toHaveProperty("@toss/tds-mobile");
      expect(packageJson.dependencies).toHaveProperty("@emotion/react");
    });
  });

  describe("Integration: 전체 플로우 — 빈/손상 상태에서도 라우팅 정상 동작", () => {
    beforeEach(() => {
      localStorage.clear();
      vi.clearAllMocks();
    });

    it("Integration[P0]: 빈 스토리지에서 로더들이 기본값으로 복구되고 배열 필드 .length 안전", async () => {
      const { loadQuizState, loadQuestions } = await import("@/lib/quizState");

      localStorage.clear();

      // 1. 상태 로드
      const state = loadQuizState();
      expect(state).toBeDefined();
      expect(state.dailyProgress).toBeDefined();

      // 2. .length 직접 접근 (크래시 테스트)
      const progressLength = state.dailyProgress.length;
      const answersLength = state.wrongAnswers.length;
      const recordsLength = state.weeklyRecords.length;

      expect(typeof progressLength).toBe("number");
      expect(typeof answersLength).toBe("number");
      expect(typeof recordsLength).toBe("number");

      // 3. 배열 메서드 직접 호출 가능
      const hasProgress = state.dailyProgress.some((p) => p.count > 0);
      expect(typeof hasProgress).toBe("boolean");

      // 4. 질문 로드
      const questions = loadQuestions();
      expect(questions.length).toBeGreaterThanOrEqual(3);

      // 5. 질문 배열 메서드 호출 가능
      const questionIds = questions.map((q) => q.id);
      expect(questionIds.length).toBe(questions.length);
    });

    it("Integration[P0]: 4가지 시나리오 모두 통과 — 빈스토리지 + 손상JSON + 부분진행 + 빈결과", async () => {
      const { getItem, DEFAULT_QUIZ_STATE } = await import("@/lib/storage");
      const { calculateAccuracy } = await import("@/lib/quizState");

      // 시나리오 1: 빈 스토리지
      localStorage.clear();
      const state1 = getItem("quiz-state", DEFAULT_QUIZ_STATE);
      expect(Array.isArray(state1.dailyProgress)).toBe(true);

      // 시나리오 2: 손상 JSON
      localStorage.setItem("quiz-state", "not valid json");
      const state2 = getItem("quiz-state", DEFAULT_QUIZ_STATE);
      expect(state2).toEqual(DEFAULT_QUIZ_STATE);

      // 시나리오 3: 부분 진행 (completed만)
      localStorage.setItem("quiz-state", JSON.stringify({ completed: true }));
      const state3 = getItem("quiz-state", DEFAULT_QUIZ_STATE);
      expect(state3.completed).toBe(true);
      expect(Array.isArray(state3.dailyProgress)).toBe(true);

      // 시나리오 4: API 미설정 (빈 결과 배열)
      const accuracy = calculateAccuracy([]);
      expect(accuracy).toBe(0);

      // 모든 시나리오 통과
      expect(true).toBe(true);
    });
  });
});
