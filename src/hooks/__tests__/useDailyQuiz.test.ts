import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";

/**
 * useDailyQuiz 훅 회귀 테스트
 *
 * 빈 스토리지, 손상 JSON, 부분 진행 상태, API 미설정(빈 문제 목록) 4개 시나리오에서
 * 훅이 크래시 없이 항상 배열을 반환하는지 검증한다.
 */

describe("useDailyQuiz 훅 회귀 테스트", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("빈 스토리지 — 저장된 questions가 없어도 기본 문제 목록에서 배열을 반환한다", async () => {
    const { useDailyQuiz } = await import("@/hooks/useDailyQuiz");
    const consoleErrorSpy = vi.spyOn(console, "error");

    localStorage.clear();
    const { result } = renderHook(() => useDailyQuiz("2024-01-15"));

    expect(Array.isArray(result.current)).toBe(true);
    expect(result.current.length).toBeGreaterThan(0);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("손상 JSON — questions가 파싱 불가능해도 크래시 없이 배열을 반환한다", async () => {
    const { useDailyQuiz } = await import("@/hooks/useDailyQuiz");
    const consoleErrorSpy = vi.spyOn(console, "error");

    localStorage.setItem("questions", "{not valid json");
    const { result } = renderHook(() => useDailyQuiz("2024-01-15"));

    expect(Array.isArray(result.current)).toBe(true);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("부분 진행 상태 — quiz-state에 completed만 있어도 훅은 문제 배열을 정상 반환한다", async () => {
    const { useDailyQuiz } = await import("@/hooks/useDailyQuiz");

    localStorage.setItem("quiz-state", JSON.stringify({ completed: true }));
    const { result } = renderHook(() => useDailyQuiz("2024-01-15"));

    expect(Array.isArray(result.current)).toBe(true);
    expect(result.current.length).toBeGreaterThan(0);
  });

  it("API 미설정 로컬 모드 — 저장된 questions가 빈 배열이면 빈 배열을 반환한다(크래시 없음)", async () => {
    const { useDailyQuiz } = await import("@/hooks/useDailyQuiz");
    const consoleErrorSpy = vi.spyOn(console, "error");

    localStorage.setItem("questions", "[]");
    const { result } = renderHook(() => useDailyQuiz("2024-01-15"));

    expect(Array.isArray(result.current)).toBe(true);
    expect(result.current.length).toBe(0);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("date를 생략해도 크래시 없이 배열을 반환한다", async () => {
    const { useDailyQuiz } = await import("@/hooks/useDailyQuiz");

    localStorage.clear();
    const { result } = renderHook(() => useDailyQuiz());

    expect(Array.isArray(result.current)).toBe(true);
  });
});
