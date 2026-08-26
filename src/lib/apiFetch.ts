// API fetch wrapper: 5000ms timeout (AbortController) + status-based single retry.
// Retry decision lives ONLY here — mapHttpError stays a pure status→AppError mapper.

import type { Result } from "@/lib/types";
import { mapHttpError } from "@/lib/errors";

const TIMEOUT_MS = 5000;
const RETRY_DELAY_MS = 1000;
const RETRY_AFTER_CAP_MS = 60000;
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

type AttemptResult<T> =
  | { kind: "success"; value: T }
  | { kind: "http-error"; status: number; retryAfterMs: number }
  | { kind: "network-error" }
  | { kind: "timeout" };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Timers only guarantee firing "no earlier than" their delay, never exactly at it —
// poll past the boundary so a fixed retry gap never races the deadline it waited for.
function sleepPastDeadline(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      const elapsed = Date.now() - start;
      if (elapsed > ms) {
        resolve();
        return;
      }
      setTimeout(check, Math.max(1, ms - elapsed));
    };
    setTimeout(check, ms);
  });
}

function parseRetryAfterMs(headerValue: string | null): number {
  if (!headerValue) return RETRY_AFTER_CAP_MS;
  const seconds = Number(headerValue);
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 60) return RETRY_AFTER_CAP_MS;
  return seconds * 1000;
}

async function attemptFetch<T>(url: string, init: RequestInit | undefined): Promise<AttemptResult<T>> {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<AttemptResult<T>>((resolve) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      resolve({ kind: "timeout" });
    }, TIMEOUT_MS);
  });

  const fetchPromise: Promise<AttemptResult<T>> = fetch(url, { ...init, signal: controller.signal })
    .then(async (response) => {
      if (response.ok) {
        const value = (await response.json()) as T;
        return { kind: "success", value } as const;
      }
      const retryAfterMs =
        response.status === 429 ? parseRetryAfterMs(response.headers.get("Retry-After")) : RETRY_DELAY_MS;
      return { kind: "http-error", status: response.status, retryAfterMs } as const;
    })
    .catch(() => ({ kind: "network-error" }) as const);

  const result = await Promise.race([timeoutPromise, fetchPromise]);
  clearTimeout(timeoutId!);
  return result;
}

function resultFromAttempt<T>(attempt: AttemptResult<T>): Result<T> {
  if (attempt.kind === "success") return { ok: true, value: attempt.value };
  if (attempt.kind === "timeout") return { ok: false, error: mapHttpError(408) };
  if (attempt.kind === "network-error") {
    return { ok: false, error: mapHttpError(0) };
  }
  return { ok: false, error: mapHttpError(attempt.status) };
}

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<Result<T>> {
  const first = await attemptFetch<T>(url, init);

  if (first.kind === "success") {
    return { ok: true, value: first.value };
  }

  const shouldRetry =
    first.kind === "network-error" || (first.kind === "http-error" && RETRYABLE_STATUSES.has(first.status));

  if (!shouldRetry) {
    return resultFromAttempt(first);
  }

  if (first.kind === "http-error" && first.status === 429) {
    await sleep(first.retryAfterMs);
  } else {
    await sleepPastDeadline(RETRY_DELAY_MS);
  }

  const second = await attemptFetch<T>(url, init);
  return resultFromAttempt(second);
}
