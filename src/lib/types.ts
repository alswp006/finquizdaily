// Domain types — pure declarations only, no runtime code.

export interface AppError {
  code: string;
  message: string;
  statusCode?: number;
  timestamp?: string;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: AppError };

export interface Question {
  id: string;
  category: string;
  text: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
  deepExplanation: string;
}

export interface Note {
  questionId: string;
  status: "todo" | "done";
  reviewedAt: number | null;
  createdAt: number;
}

export interface DailySession {
  dateKey: string;
  answers: number[];
  score: number;
  status: "in_progress" | "completed";
}

export type Badge =
  | "first_quiz"
  | "streak_3"
  | "streak_7"
  | "streak_30"
  | "perfect_score"
  | "note_master"
  | "rank_top10";

export interface Profile {
  userKey: string;
  nickname: string;
  totalScore: number;
  streak: number;
  lastCompletedDateKey: string | null;
  badges: Badge[];
  noteDoneCount: number;
}

export interface Flags {
  rankOptIn: boolean;
  rankDisabledReason: string | null;
  lastShareAt: number | null;
  deepExplainUnlockedDateKey: string | null;
}

export interface DeepExplainState {
  questionId: string;
  unlocked: boolean;
  content: string | null;
}

export interface RankEntry {
  rank: number;
  nickname: string;
  score: number;
  isMe?: boolean;
}

export interface RankCache {
  weekKey: string;
  entries: RankEntry[];
  fetchedAt: number;
}

export type RouteState = {
  "/": undefined;
  "/daily": undefined;
  "/daily/result": { dateKey: string } | undefined;
  "/notes": undefined;
  "/notes/:questionId": undefined;
  "/rank": undefined;
  "/share": { dateKey: string } | undefined;
};
