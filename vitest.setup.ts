import { beforeEach, afterEach, vi } from "vitest";

// jsdom's localStorage/sessionStorage persist between tests by default — clear to prevent pollution.
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});
