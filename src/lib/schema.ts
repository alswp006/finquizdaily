// Runtime schema guards — parse functions that return Result<T>, never throw.
// This file will be implemented in the green phase after tests guide development.

import type { Result, DailySession, Note, Profile, RankEntry } from "./types";

export function parseSession(data: unknown): Result<DailySession> {
  throw new Error("Not implemented");
}

export function parseNote(data: unknown): Result<Note> {
  throw new Error("Not implemented");
}

export function parseProfile(data: unknown): Result<Profile> {
  throw new Error("Not implemented");
}

export function parseRankEntry(data: unknown): Result<RankEntry> {
  throw new Error("Not implemented");
}

export function parseLeaderboardResponse(
  data: unknown
): Result<{ entries: RankEntry[]; droppedCount: number }> {
  throw new Error("Not implemented");
}
