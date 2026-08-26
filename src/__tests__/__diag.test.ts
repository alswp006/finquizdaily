import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("diag", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("boundary check with race+async chain", async () => {
    let fired = 0;

    async function attempt() {
      const controller = new AbortController();
      let timeoutId: ReturnType<typeof setTimeout>;
      const timeoutPromise = new Promise((resolve) => {
        timeoutId = setTimeout(() => resolve({ kind: "timeout" }), 5000);
      });
      const fetchPromise = Promise.resolve(
        new Response(JSON.stringify({ error: "timeout" }), { status: 408 })
      ).then(async (response) => {
        await response.text();
        return { kind: "http-error", status: response.status };
      });
      const result = await Promise.race([timeoutPromise, fetchPromise]);
      clearTimeout(timeoutId!);
      return result;
    }

    console.log("start time:", Date.now());
    (async () => {
      await attempt();
      console.log("scheduling retry at virtual time:", Date.now());
      setTimeout(() => {
        fired++;
        console.log("retry fired at virtual time:", Date.now());
      }, 1000);
    })();

    await vi.advanceTimersByTimeAsync(500);
    console.log("fired at cumulative 500:", fired);
    await vi.advanceTimersByTimeAsync(500);
    console.log("fired at cumulative 1000:", fired);
    await vi.advanceTimersByTimeAsync(1);
    console.log("fired at cumulative 1001:", fired);
  });
});
