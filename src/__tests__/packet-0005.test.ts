import { describe, it, expect } from "vitest";
import type { Result, AppError, DailySession, Note, Profile, RankEntry } from "@/lib/types";
import {
  parseSession,
  parseNote,
  parseProfile,
  parseRankEntry,
  parseLeaderboardResponse,
} from "@/lib/schema";

/**
 * Runtime schema guards — parseX returns Result<T>, never throws.
 * Error classification:
 *   E_VALIDATION: missing required key (statusCode 400)
 *   E_TYPE_MISMATCH: type mismatch (statusCode 400)
 *   E_SCHEMA_INVALID: range/structure violation (statusCode 422)
 */

describe("Runtime Schema Guards (parseX — throw 0건)", () => {
  describe("AC-1: No exceptions thrown for all three error cases", () => {
    it("AC-1[P0]: parseSession never throws on E_VALIDATION (missing key)", () => {
      // Arrange: missing 'answers' key
      const invalidData = { dateKey: "2026-08-26", score: 100 };

      // Act & Assert: no throw, returns error result
      expect(() => {
        const result = parseSession(invalidData);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.code).toBe("E_VALIDATION");
          expect(result.error.statusCode).toBe(400);
        }
      }).not.toThrow();
    });

    it("AC-1[P0]: parseSession never throws on E_TYPE_MISMATCH", () => {
      // Arrange: answers is not array
      const invalidData = { dateKey: "2026-08-26", answers: "not-array", score: 100, status: "completed" };

      // Act & Assert: no throw, returns error result
      expect(() => {
        const result = parseSession(invalidData);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.code).toBe("E_TYPE_MISMATCH");
          expect(result.error.statusCode).toBe(400);
        }
      }).not.toThrow();
    });

    it("AC-1[P0]: parseSession never throws on E_SCHEMA_INVALID", () => {
      // Arrange: answers array has invalid value (outside -1..3)
      const invalidData = {
        dateKey: "2026-08-26",
        answers: [0, 1, 5], // 5 exceeds max 3
        score: 100,
        status: "completed",
      };

      // Act & Assert: no throw, returns error result
      expect(() => {
        const result = parseSession(invalidData);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.code).toBe("E_SCHEMA_INVALID");
          expect(result.error.statusCode).toBe(422);
        }
      }).not.toThrow();
    });

    it("AC-1[P0]: parseProfile never throws on E_VALIDATION", () => {
      const invalidData = { nickname: "User", totalScore: 100 }; // missing required fields

      expect(() => {
        const result = parseProfile(invalidData);
        expect(result.ok).toBe(false);
      }).not.toThrow();
    });

    it("AC-1[P0]: parseLeaderboardResponse never throws on E_SCHEMA_INVALID", () => {
      const invalidData = { entries: "not-array" }; // entries should be array

      expect(() => {
        const result = parseLeaderboardResponse(invalidData);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.statusCode).toBe(422);
        }
      }).not.toThrow();
    });
  });

  describe("AC-2: Success returns object with no extra keys beyond schema", () => {
    it("AC-2[P0]: parseSession success returns only schema keys", () => {
      // Arrange: valid session + extra keys
      const validData = {
        dateKey: "2026-08-26",
        answers: [0, 1, 2],
        score: 100,
        status: "completed",
        extraKey: "should be removed",
        anotherExtra: 123,
      };

      // Act
      const result = parseSession(validData);

      // Assert: ok=true and no extra keys
      expect(result.ok).toBe(true);
      if (result.ok) {
        const keys = Object.keys(result.value);
        expect(keys).toEqual(["dateKey", "answers", "score", "status"]);
        expect(keys).not.toContain("extraKey");
        expect(keys).not.toContain("anotherExtra");
      }
    });

    it("AC-2[P0]: parseProfile success returns only schema keys", () => {
      // Arrange: valid profile + extra keys
      const validData = {
        userKey: "user123",
        nickname: "Alice",
        totalScore: 500,
        streak: 3,
        lastCompletedDateKey: "2026-08-26",
        badges: ["first_quiz"],
        noteDoneCount: 10,
        unwantedField: "ignored",
      };

      // Act
      const result = parseProfile(validData);

      // Assert: ok=true and no extra keys
      expect(result.ok).toBe(true);
      if (result.ok) {
        const keys = Object.keys(result.value);
        expect(keys).toEqual([
          "userKey",
          "nickname",
          "totalScore",
          "streak",
          "lastCompletedDateKey",
          "badges",
          "noteDoneCount",
        ]);
        expect(keys).not.toContain("unwantedField");
      }
    });
  });

  describe("AC-3: parseSession validates answers array (type, range, elements)", () => {
    it("AC-3[P0]: answers missing triggers E_VALIDATION(400)", () => {
      const invalidData = { dateKey: "2026-08-26", score: 100, status: "completed" };
      const result = parseSession(invalidData);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("E_VALIDATION");
        expect(result.error.statusCode).toBe(400);
      }
    });

    it("AC-3[P0]: answers not array triggers E_TYPE_MISMATCH(400)", () => {
      const invalidData = {
        dateKey: "2026-08-26",
        answers: { index: 0 }, // object instead of array
        score: 100,
        status: "completed",
      };
      const result = parseSession(invalidData);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("E_TYPE_MISMATCH");
        expect(result.error.statusCode).toBe(400);
      }
    });

    it("AC-3[P0]: answers element not integer triggers E_TYPE_MISMATCH(400)", () => {
      const invalidData = {
        dateKey: "2026-08-26",
        answers: [0, "1", 2], // string in array
        score: 100,
        status: "completed",
      };
      const result = parseSession(invalidData);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("E_TYPE_MISMATCH");
      }
    });

    it("AC-3[P0]: answers element < -1 triggers E_SCHEMA_INVALID(422)", () => {
      const invalidData = {
        dateKey: "2026-08-26",
        answers: [-2, 0, 1], // -2 is less than -1
        score: 100,
        status: "completed",
      };
      const result = parseSession(invalidData);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("E_SCHEMA_INVALID");
        expect(result.error.statusCode).toBe(422);
      }
    });

    it("AC-3[P0]: answers element > 3 triggers E_SCHEMA_INVALID(422)", () => {
      const invalidData = {
        dateKey: "2026-08-26",
        answers: [0, 1, 4], // 4 exceeds max 3
        score: 100,
        status: "completed",
      };
      const result = parseSession(invalidData);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("E_SCHEMA_INVALID");
        expect(result.error.statusCode).toBe(422);
      }
    });

    it("AC-3[P0]: valid answers (range -1..3, all integers) succeeds", () => {
      const validData = {
        dateKey: "2026-08-26",
        answers: [-1, 0, 1, 2, 3],
        score: 100,
        status: "in_progress",
      };
      const result = parseSession(validData);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.answers).toEqual([-1, 0, 1, 2, 3]);
      }
    });

    it("AC-3[P0]: empty answers array succeeds", () => {
      const validData = {
        dateKey: "2026-08-26",
        answers: [],
        score: 0,
        status: "in_progress",
      };
      const result = parseSession(validData);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.answers).toEqual([]);
      }
    });
  });

  describe("AC-4: parseProfile validates streak & badges (filter unknown badges)", () => {
    it("AC-4[P0]: negative streak triggers E_SCHEMA_INVALID(422)", () => {
      const invalidData = {
        userKey: "user1",
        nickname: "Alice",
        totalScore: 100,
        streak: -1, // negative not allowed
        lastCompletedDateKey: null,
        badges: [],
        noteDoneCount: 0,
      };
      const result = parseProfile(invalidData);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("E_SCHEMA_INVALID");
        expect(result.error.statusCode).toBe(422);
      }
    });

    it("AC-4[P0]: badges not array triggers E_SCHEMA_INVALID(422)", () => {
      const invalidData = {
        userKey: "user1",
        nickname: "Alice",
        totalScore: 100,
        streak: 0,
        lastCompletedDateKey: null,
        badges: "not-array",
        noteDoneCount: 0,
      };
      const result = parseProfile(invalidData);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("E_SCHEMA_INVALID");
        expect(result.error.statusCode).toBe(422);
      }
    });

    it("AC-4[P0]: badges with unknown literals are filtered out", () => {
      const validData = {
        userKey: "user1",
        nickname: "Alice",
        totalScore: 100,
        streak: 3,
        lastCompletedDateKey: "2026-08-26",
        badges: ["first_quiz", "unknown_badge", "streak_3", "fake_badge"],
        noteDoneCount: 5,
      };
      const result = parseProfile(validData);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Only known badges remain
        expect(result.value.badges).toEqual(["first_quiz", "streak_3"]);
        expect(result.value.badges).not.toContain("unknown_badge");
        expect(result.value.badges).not.toContain("fake_badge");
      }
    });

    it("AC-4[P0]: all known badges are preserved", () => {
      const allKnownBadges = [
        "first_quiz",
        "streak_3",
        "streak_7",
        "streak_30",
        "perfect_score",
        "note_master",
        "rank_top10",
      ];
      const validData = {
        userKey: "user1",
        nickname: "Alice",
        totalScore: 100,
        streak: 30,
        lastCompletedDateKey: "2026-08-26",
        badges: allKnownBadges,
        noteDoneCount: 20,
      };
      const result = parseProfile(validData);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.badges).toEqual(allKnownBadges);
      }
    });

    it("AC-4[P0]: empty badges array succeeds", () => {
      const validData = {
        userKey: "user1",
        nickname: "Alice",
        totalScore: 100,
        streak: 0,
        lastCompletedDateKey: null,
        badges: [],
        noteDoneCount: 0,
      };
      const result = parseProfile(validData);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.badges).toEqual([]);
      }
    });

    it("AC-4[P0]: zero and positive streaks are valid", () => {
      for (const streak of [0, 1, 3, 30, 365]) {
        const validData = {
          userKey: "user1",
          nickname: "Alice",
          totalScore: 100,
          streak,
          lastCompletedDateKey: "2026-08-26",
          badges: [],
          noteDoneCount: 5,
        };
        const result = parseProfile(validData);

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.streak).toBe(streak);
        }
      }
    });
  });

  describe("AC-5: parseLeaderboardResponse filters entries, returns droppedCount", () => {
    it("AC-5[P0]: entries not array triggers E_SCHEMA_INVALID(422)", () => {
      const invalidData = { entries: "not-array" };
      const result = parseLeaderboardResponse(invalidData);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("E_SCHEMA_INVALID");
        expect(result.error.statusCode).toBe(422);
      }
    });

    it("AC-5[P0]: empty entries array succeeds with droppedCount = 0", () => {
      const validData = { entries: [] };
      const result = parseLeaderboardResponse(validData);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.entries).toEqual([]);
        expect(result.value.droppedCount).toBe(0);
      }
    });

    it("AC-5[P0]: valid entries are preserved", () => {
      const validData = {
        entries: [
          { rank: 1, nickname: "Alice", score: 500, isMe: false },
          { rank: 2, nickname: "Bob", score: 450 },
          { rank: 3, nickname: "You", score: 400, isMe: true },
        ],
      };
      const result = parseLeaderboardResponse(validData);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.entries).toHaveLength(3);
        expect(result.value.entries[0].nickname).toBe("Alice");
        expect(result.value.entries[2].isMe).toBe(true);
        expect(result.value.droppedCount).toBe(0);
      }
    });

    it("AC-5[P0]: invalid entries are filtered, droppedCount incremented", () => {
      const validData = {
        entries: [
          { rank: 1, nickname: "Alice", score: 500 }, // valid
          { rank: 2, nickname: "Bob" }, // missing score
          { rank: 3, nickname: "Charlie", score: 400 }, // valid
          { rank: 4, score: 350 }, // missing nickname
        ],
      };
      const result = parseLeaderboardResponse(validData);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Only valid entries remain
        expect(result.value.entries.length).toBeLessThan(4);
        expect(result.value.entries).toContainEqual(
          expect.objectContaining({ nickname: "Alice" })
        );
        expect(result.value.entries).toContainEqual(
          expect.objectContaining({ nickname: "Charlie" })
        );
        // droppedCount = number of invalid entries filtered out
        expect(result.value.droppedCount).toBeGreaterThan(0);
      }
    });

    it("AC-5[P0]: returns object with entries and droppedCount keys only", () => {
      const validData = {
        entries: [{ rank: 1, nickname: "Alice", score: 500 }],
        extraKey: "ignored",
      };
      const result = parseLeaderboardResponse(validData);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const keys = Object.keys(result.value);
        expect(keys).toEqual(["entries", "droppedCount"]);
      }
    });
  });

  describe("parseNote validation", () => {
    it("should succeed with valid Note data", () => {
      const validData = {
        questionId: "q-001",
        status: "todo",
        reviewedAt: null,
        createdAt: 1693065600000,
      };
      const result = parseNote(validData);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.questionId).toBe("q-001");
        expect(result.value.status).toBe("todo");
      }
    });

    it("should reject Note with missing questionId", () => {
      const invalidData = {
        status: "done",
        reviewedAt: 1693065600000,
        createdAt: 1693065600000,
      };
      const result = parseNote(invalidData);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.statusCode).toBe(400);
      }
    });
  });

  describe("parseRankEntry validation", () => {
    it("should succeed with valid RankEntry data", () => {
      const validData = {
        rank: 1,
        nickname: "Alice",
        score: 500,
      };
      const result = parseRankEntry(validData);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.rank).toBe(1);
        expect(result.value.score).toBe(500);
      }
    });

    it("should succeed with optional isMe field", () => {
      const validData = {
        rank: 12,
        nickname: "You",
        score: 350,
        isMe: true,
      };
      const result = parseRankEntry(validData);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.isMe).toBe(true);
      }
    });

    it("should reject RankEntry with missing rank", () => {
      const invalidData = {
        nickname: "Alice",
        score: 500,
      };
      const result = parseRankEntry(invalidData);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.statusCode).toBe(400);
      }
    });
  });
});
