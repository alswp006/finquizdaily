// Runtime schema guards — parse functions that return Result<T>, never throw.
// Error classification:
//   E_VALIDATION (400): required key missing
//   E_TYPE_MISMATCH (400): value has the wrong type
//   E_SCHEMA_INVALID (422): value has the right type but violates range/structure

import type { Result, DailySession, Note, Profile, RankEntry, Badge } from "./types";
import { ERROR_CATALOG } from "./errorCatalog";

type SchemaErrorCode = "E_VALIDATION" | "E_TYPE_MISMATCH" | "E_SCHEMA_INVALID";

const KNOWN_BADGES: readonly Badge[] = [
  "first_quiz",
  "streak_3",
  "streak_7",
  "streak_30",
  "perfect_score",
  "note_master",
  "rank_top10",
];

function fail(code: SchemaErrorCode): { ok: false; error: { code: SchemaErrorCode; message: string; statusCode: number } } {
  const entry = ERROR_CATALOG[code];
  return { ok: false, error: { code, message: entry.userMessage, statusCode: entry.httpStatus } };
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function missingKeys(obj: Record<string, unknown>, keys: string[]): string[] {
  return keys.filter((k) => !(k in obj));
}

export function parseSession(data: unknown): Result<DailySession> {
  if (!isRecord(data)) return fail("E_VALIDATION");
  if (missingKeys(data, ["dateKey", "answers", "score", "status"]).length > 0) {
    return fail("E_VALIDATION");
  }

  const { dateKey, answers, score, status } = data;

  if (typeof dateKey !== "string") return fail("E_TYPE_MISMATCH");
  if (typeof score !== "number") return fail("E_TYPE_MISMATCH");
  if (typeof status !== "string") return fail("E_TYPE_MISMATCH");
  if (status !== "in_progress" && status !== "completed") return fail("E_SCHEMA_INVALID");
  if (!Array.isArray(answers)) return fail("E_TYPE_MISMATCH");

  const parsedAnswers: number[] = [];
  for (const a of answers) {
    if (!Number.isInteger(a)) return fail("E_TYPE_MISMATCH");
    if (a < -1 || a > 3) return fail("E_SCHEMA_INVALID");
    parsedAnswers.push(a);
  }

  return { ok: true, value: { dateKey, answers: parsedAnswers, score, status } };
}

export function parseNote(data: unknown): Result<Note> {
  if (!isRecord(data)) return fail("E_VALIDATION");
  if (missingKeys(data, ["questionId", "status", "reviewedAt", "createdAt"]).length > 0) {
    return fail("E_VALIDATION");
  }

  const { questionId, status, reviewedAt, createdAt } = data;

  if (typeof questionId !== "string") return fail("E_TYPE_MISMATCH");
  if (typeof status !== "string") return fail("E_TYPE_MISMATCH");
  if (status !== "todo" && status !== "done") return fail("E_SCHEMA_INVALID");
  if (reviewedAt !== null && typeof reviewedAt !== "number") return fail("E_TYPE_MISMATCH");
  if (typeof createdAt !== "number") return fail("E_TYPE_MISMATCH");

  return { ok: true, value: { questionId, status, reviewedAt, createdAt } };
}

export function parseProfile(data: unknown): Result<Profile> {
  if (!isRecord(data)) return fail("E_VALIDATION");
  if (
    missingKeys(data, [
      "userKey",
      "nickname",
      "totalScore",
      "streak",
      "lastCompletedDateKey",
      "badges",
      "noteDoneCount",
    ]).length > 0
  ) {
    return fail("E_VALIDATION");
  }

  const { userKey, nickname, totalScore, streak, lastCompletedDateKey, badges, noteDoneCount } = data;

  if (typeof userKey !== "string") return fail("E_TYPE_MISMATCH");
  if (typeof nickname !== "string") return fail("E_TYPE_MISMATCH");
  if (typeof totalScore !== "number") return fail("E_TYPE_MISMATCH");
  if (typeof streak !== "number") return fail("E_TYPE_MISMATCH");
  if (lastCompletedDateKey !== null && typeof lastCompletedDateKey !== "string") return fail("E_TYPE_MISMATCH");
  if (typeof noteDoneCount !== "number") return fail("E_TYPE_MISMATCH");

  if (streak < 0) return fail("E_SCHEMA_INVALID");
  if (!Array.isArray(badges)) return fail("E_SCHEMA_INVALID");

  const filteredBadges = badges.filter(
    (b): b is Badge => typeof b === "string" && (KNOWN_BADGES as readonly string[]).includes(b)
  );

  return {
    ok: true,
    value: { userKey, nickname, totalScore, streak, lastCompletedDateKey, badges: filteredBadges, noteDoneCount },
  };
}

export function parseRankEntry(data: unknown): Result<RankEntry> {
  if (!isRecord(data)) return fail("E_VALIDATION");
  if (missingKeys(data, ["rank", "nickname", "score"]).length > 0) {
    return fail("E_VALIDATION");
  }

  const { rank, nickname, score, isMe } = data;

  if (typeof rank !== "number") return fail("E_TYPE_MISMATCH");
  if (typeof nickname !== "string") return fail("E_TYPE_MISMATCH");
  if (typeof score !== "number") return fail("E_TYPE_MISMATCH");
  if (isMe !== undefined && typeof isMe !== "boolean") return fail("E_TYPE_MISMATCH");

  const value: RankEntry = { rank, nickname, score };
  if (typeof isMe === "boolean") value.isMe = isMe;

  return { ok: true, value };
}

export function parseLeaderboardResponse(
  data: unknown
): Result<{ entries: RankEntry[]; droppedCount: number }> {
  if (!isRecord(data)) return fail("E_VALIDATION");
  if (!("entries" in data)) return fail("E_VALIDATION");

  const { entries } = data;
  if (!Array.isArray(entries)) return fail("E_SCHEMA_INVALID");

  const validEntries: RankEntry[] = [];
  let droppedCount = 0;

  for (const item of entries) {
    const result = parseRankEntry(item);
    if (result.ok) {
      validEntries.push(result.value);
    } else {
      droppedCount += 1;
    }
  }

  return { ok: true, value: { entries: validEntries, droppedCount } };
}
