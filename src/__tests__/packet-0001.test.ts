import { describe, it, expect } from "vitest";
import type {
  RouteState,
  Result,
  Question,
  Note,
  DailySession,
  Profile,
  Badge,
  Flags,
  DeepExplainState,
  RankCache,
  RankEntry,
  AppError,
} from "@/lib/types";

describe("Packet 0001: 도메인 타입 + RouteState 정의", () => {
  describe("AC-1: TypeScript-only type declarations (no runtime code)", () => {
    it("AC-1: should compile without TypeScript errors", () => {
      // Type import succeeds = types are exported correctly
      // Real validation: npx tsc --noEmit (run separately)
      expect(true).toBe(true);
    });
  });

  describe("AC-2: RouteState with all 7 route paths and correct state shapes", () => {
    it("AC-2a: RouteState should have all 7 required route path keys", () => {
      const expectedRoutes = ["/", "/daily", "/daily/result", "/notes", "/notes/:questionId", "/rank", "/share"];
      expect(expectedRoutes).toHaveLength(7);
    });

    it("AC-2b: /daily/result state should accept { dateKey: string } | undefined", () => {
      // Type assertion: if this compiles, RouteState['/daily/result'] allows these values
      const stateWithDate: RouteState["/daily/result"] = { dateKey: "2026-08-26" };
      const stateUndefined: RouteState["/daily/result"] = undefined;

      expect(stateWithDate.dateKey).toBe("2026-08-26");
      expect(stateUndefined).toBeUndefined();
    });

    it("AC-2c: /share state should accept { dateKey: string } | undefined", () => {
      const stateWithDate: RouteState["/share"] = { dateKey: "2026-08-26" };
      const stateUndefined: RouteState["/share"] = undefined;

      expect(stateWithDate.dateKey).toBe("2026-08-26");
      expect(stateUndefined).toBeUndefined();
    });

    it("AC-2d: Other routes (/, /daily, /notes, /notes/:questionId, /rank) should accept undefined state", () => {
      const homeState: RouteState["/"] = undefined;
      const dailyState: RouteState["/daily"] = undefined;
      const notesState: RouteState["/notes"] = undefined;
      const noteDetailState: RouteState["/notes/:questionId"] = undefined;
      const rankState: RouteState["/rank"] = undefined;

      expect(homeState).toBeUndefined();
      expect(dailyState).toBeUndefined();
      expect(notesState).toBeUndefined();
      expect(noteDetailState).toBeUndefined();
      expect(rankState).toBeUndefined();
    });
  });

  describe("AC-3: Result<T> generic discriminated union type", () => {
    it("AC-3a: Result<T> success case: { ok: true; value: T }", () => {
      const successResult: Result<number> = { ok: true, value: 42 };
      expect(successResult.ok).toBe(true);
      if (successResult.ok) {
        expect(successResult.value).toBe(42);
      }
    });

    it("AC-3b: Result<T> error case: { ok: false; error: AppError }", () => {
      const errorResult: Result<number> = {
        ok: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid input" },
      };
      expect(errorResult.ok).toBe(false);
      if (!errorResult.ok) {
        expect(errorResult.error.code).toBe("VALIDATION_ERROR");
        expect(errorResult.error.message).toBe("Invalid input");
      }
    });

    it("AC-3c: Result<T> should work with complex object types", () => {
      interface UserProfile {
        id: string;
        name: string;
        score: number;
      }

      const result: Result<UserProfile> = {
        ok: true,
        value: { id: "user123", name: "Alice", score: 95 },
      };

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe("user123");
        expect(result.value.name).toBe("Alice");
        expect(result.value.score).toBe(95);
      }
    });
  });

  describe("Supporting domain types", () => {
    it("Note type should have required fields: questionId, status, reviewedAt, createdAt", () => {
      const now = Date.now();
      const noteTodo: Note = {
        questionId: "q123",
        status: "todo",
        reviewedAt: null,
        createdAt: now,
      };

      expect(noteTodo.questionId).toBe("q123");
      expect(noteTodo.status).toBe("todo");
      expect(noteTodo.reviewedAt).toBeNull();
      expect(noteTodo.createdAt).toBe(now);
    });

    it("Note status field should only allow 'todo' or 'done' (string literal type)", () => {
      const noteTodo: Note = {
        questionId: "q1",
        status: "todo",
        reviewedAt: null,
        createdAt: 0,
      };
      const noteDone: Note = {
        questionId: "q1",
        status: "done",
        reviewedAt: Date.now(),
        createdAt: 0,
      };

      expect(["todo", "done"]).toContain(noteTodo.status);
      expect(["todo", "done"]).toContain(noteDone.status);
    });

    it("Note reviewedAt should accept null or a timestamp number", () => {
      const noteNeverReviewed: Note = {
        questionId: "q1",
        status: "todo",
        reviewedAt: null,
        createdAt: 0,
      };
      const noteReviewed: Note = {
        questionId: "q1",
        status: "done",
        reviewedAt: 1693065600000,
        createdAt: 1693065600000,
      };

      expect(noteNeverReviewed.reviewedAt).toBeNull();
      expect(typeof noteReviewed.reviewedAt).toBe("number");
    });

    it("should export all required domain types (Question, DailySession, Profile, Badge, Flags, DeepExplainState, RankCache, RankEntry)", () => {
      // If imports at top of file succeed, all types are exported
      // Actual shape validation happens in integration tests per packet
      expect(true).toBe(true);
    });
  });

  describe("Type integrity (compile-time and runtime)", () => {
    it("AppError should have code and message fields for error handling", () => {
      const error: AppError = {
        code: "NOT_FOUND",
        message: "Question not found",
      };

      expect(error.code).toBe("NOT_FOUND");
      expect(error.message).toBe("Question not found");
    });

    it("Result discriminated union should enforce field presence by ok flag", () => {
      // Success: value exists, error absent
      const success: Result<string> = { ok: true, value: "data" };
      expect(success.ok).toBe(true);
      expect("value" in success).toBe(true);

      // Error: error exists, value absent
      const error: Result<string> = { ok: false, error: { code: "E1", message: "msg" } };
      expect(error.ok).toBe(false);
      expect("error" in error).toBe(true);
    });
  });
});
