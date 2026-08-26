// fqd:v1:* 네임스페이스 전용 localStorage 헬퍼 — 자가복구 + quota 가드.

export const KEYS = {
  notes: "fqd:v1:notes",
  sessions: "fqd:v1:sessions",
  profile: "fqd:v1:profile",
  flags: "fqd:v1:flags",
  rankCache: "fqd:v1:rankCache",
} as const;

function hasLocalStorage(): boolean {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
}

function readRaw(key: string): string | null {
  if (!hasLocalStorage()) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function recover<T>(key: string, defaultValue: T): void {
  console.warn(`[fqd-storage] ${key}: malformed data, resetting to default`);
  write(key, defaultValue);
}

export function readArray<T>(key: string, defaultValue: T[]): T[] {
  const raw = readRaw(key);
  if (raw === null) return defaultValue;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    recover(key, defaultValue);
    return defaultValue;
  }

  if (!Array.isArray(parsed)) {
    recover(key, defaultValue);
    return defaultValue;
  }

  return parsed as T[];
}

export function readObject(
  key: string,
  defaultValue: Record<string, unknown>
): Record<string, unknown>;
export function readObject<T extends Record<string, unknown>>(
  key: string,
  defaultValue: T
): T;
export function readObject<T extends Record<string, unknown>>(
  key: string,
  defaultValue: T
): T {
  const raw = readRaw(key);
  if (raw === null) return defaultValue;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    recover(key, defaultValue);
    return defaultValue;
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    recover(key, defaultValue);
    return defaultValue;
  }

  return parsed as T;
}

export function write<T>(key: string, value: T): boolean {
  if (!hasLocalStorage()) return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function remove(key: string): void {
  if (!hasLocalStorage()) return;
  try {
    localStorage.removeItem(key);
  } catch {
    // no-op: 삭제 실패는 무시 — 다음 read가 자가복구한다
  }
}
