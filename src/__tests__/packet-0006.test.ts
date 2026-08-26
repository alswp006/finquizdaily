import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { AppError, Result } from "@/lib/types";
import { mapHttpError, logAppError } from "@/lib/errors";
import { apiFetch } from "@/lib/apiFetch";
import { ERROR_CATALOG } from "@/lib/errorCatalog";

describe("Packet 0006: mapHttpError + logAppError + apiFetch(타임아웃·재시도)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("mapHttpError: HTTP status → AppError", () => {
    it("AC-3.1: maps 418 (unmapped status) to E_SERVER with httpStatus 500", () => {
      const err = mapHttpError(418);
      expect(err.code).toBe("E_SERVER");
      expect(err.statusCode).toBe(500);
      expect(err.message).toBeDefined();
      expect(err.message.length).toBeGreaterThan(0);
    });

    it("AC-3.2: maps 400 Bad Request", () => {
      const err = mapHttpError(400, "Custom 400 message");
      expect(err.code).toBe("E_VALIDATION");
      expect(err.statusCode).toBe(400);
      expect(err.message).toBe("Custom 400 message");
    });

    it("AC-3.3: maps 401 Unauthorized", () => {
      const err = mapHttpError(401);
      expect(err.code).toBe("E_UNAUTHENTICATED");
      expect(err.statusCode).toBe(401);
    });

    it("AC-3.4: maps 403 Forbidden", () => {
      const err = mapHttpError(403);
      expect(err.code).toBe("E_FORBIDDEN");
      expect(err.statusCode).toBe(403);
    });

    it("AC-3.5: maps 404 Not Found", () => {
      const err = mapHttpError(404);
      expect(err.code).toBe("E_NOT_FOUND");
      expect(err.statusCode).toBe(404);
    });

    it("AC-3.6: maps 409 Conflict", () => {
      const err = mapHttpError(409);
      expect(err.code).toBe("E_CONFLICT_DUPLICATE");
      expect(err.statusCode).toBe(409);
    });

    it("AC-3.7: maps 413 Payload Too Large", () => {
      const err = mapHttpError(413);
      expect(err.code).toBe("E_PAYLOAD_TOO_LARGE");
      expect(err.statusCode).toBe(413);
    });

    it("AC-3.8: maps 415 Unsupported Media Type", () => {
      const err = mapHttpError(415);
      expect(err.code).toBe("E_UNSUPPORTED_MEDIA");
      expect(err.statusCode).toBe(415);
    });

    it("AC-3.9: maps 500 Server Error", () => {
      const err = mapHttpError(500);
      expect(err.code).toBe("E_SERVER");
      expect(err.statusCode).toBe(500);
    });

    it("AC-3.10: maps 502 Bad Gateway", () => {
      const err = mapHttpError(502);
      expect(err.code).toBe("E_SERVER");
      expect(err.statusCode).toBe(500);
    });

    it("AC-3.11: maps 503 Service Unavailable", () => {
      const err = mapHttpError(503);
      expect(err.code).toBe("E_UNAVAILABLE");
      expect(err.statusCode).toBe(503);
    });

    it("AC-3.12: maps 504 Gateway Timeout", () => {
      const err = mapHttpError(504);
      expect(err.code).toBe("E_SERVER");
      expect(err.statusCode).toBe(500);
    });

    it("AC-3.13: maps 408 Request Timeout", () => {
      const err = mapHttpError(408);
      expect(err.code).toBe("E_TIMEOUT");
      expect(err.statusCode).toBe(408);
    });

    it("AC-3.14: maps 429 Too Many Requests", () => {
      const err = mapHttpError(429);
      expect(err.code).toBe("E_RATE_LIMITED");
      expect(err.statusCode).toBe(429);
    });

    it("AC-3.15: maps 422 to E_SCHEMA_INVALID", () => {
      const err = mapHttpError(422);
      expect(err.code).toBe("E_SCHEMA_INVALID");
      expect(err.statusCode).toBe(422);
    });

    it("AC-3.16: maps 0 (network) to E_OFFLINE", () => {
      const err = mapHttpError(0);
      expect(err.code).toBe("E_OFFLINE");
      expect(err.statusCode).toBe(0);
    });

    it("AC-3.17: userMessage matches ERROR_CATALOG exactly for every canonical code", () => {
      for (const status of [400, 401, 403, 404, 408, 409, 422, 429, 500, 502, 503, 504, 0]) {
        const err = mapHttpError(status);
        expect(err.message).toBe(ERROR_CATALOG[err.code as keyof typeof ERROR_CATALOG].userMessage);
      }
    });
  });

  describe("logAppError: format and output", () => {
    it("AC-4.1: logs '[FQD] {code} {httpStatus} {context}' via console.warn single call", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const err: AppError = {
        code: "E_TIMEOUT",
        message: "Request timeout",
        statusCode: 408,
      };
      logAppError(err, "fetchUserProfile");
      expect(warnSpy).toHaveBeenCalledTimes(1);
      const callArg = warnSpy.mock.calls[0][0];
      expect(callArg).toMatch(/\[FQD\]/);
      expect(callArg).toContain("E_TIMEOUT");
      expect(callArg).toContain("408");
      expect(callArg).toContain("fetchUserProfile");
      warnSpy.mockRestore();
    });

    it("AC-4.2: does not include server body.message in log", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const err: AppError = {
        code: "E_SERVER",
        message: "Internal Server Error",
        statusCode: 500,
      };
      logAppError(err, "updateScore");
      const callArg = warnSpy.mock.calls[0][0];
      expect(callArg).not.toContain("Internal Server Error");
      warnSpy.mockRestore();
    });

    it("AC-4.3: does not include userKey or nickname in log", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const err: AppError = {
        code: "E_FORBIDDEN",
        message: "Access denied",
        statusCode: 403,
      };
      logAppError(err, "deleteAccount");
      const callArg = warnSpy.mock.calls[0][0];
      expect(callArg).not.toContain("userKey");
      expect(callArg).not.toContain("nickname");
      warnSpy.mockRestore();
    });
  });

  describe("apiFetch: timeout and retry logic", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("AC-1.1: does NOT retry for 400 Bad Request (total 1 request)", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "invalid" }), { status: 400 })
      );

      const promise = apiFetch<{ result: string }>(
        "https://api.example.com/data",
        { method: "GET" }
      );

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.statusCode).toBe(400);
      }
      fetchSpy.mockRestore();
    });

    it("AC-1.2: does NOT retry for 401 Unauthorized (total 1 request)", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 })
      );

      const promise = apiFetch<{ result: string }>(
        "https://api.example.com/data"
      );

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("E_UNAUTHENTICATED");
      }
      fetchSpy.mockRestore();
    });

    it("AC-1.3: does NOT retry for 403 Forbidden (total 1 request)", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "forbidden" }), { status: 403 })
      );

      const promise = apiFetch<{ result: string }>(
        "https://api.example.com/data"
      );

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(result.ok).toBe(false);
      fetchSpy.mockRestore();
    });

    it("AC-1.4: does NOT retry for 404 Not Found (total 1 request)", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "not found" }), { status: 404 })
      );

      const promise = apiFetch<{ result: string }>(
        "https://api.example.com/data"
      );

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(result.ok).toBe(false);
      fetchSpy.mockRestore();
    });

    it("AC-1.5: does NOT retry for 409 Conflict (total 1 request)", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "conflict" }), { status: 409 })
      );

      const promise = apiFetch<{ result: string }>(
        "https://api.example.com/data"
      );

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(result.ok).toBe(false);
      fetchSpy.mockRestore();
    });

    it("AC-1.6: does NOT retry for 413 Payload Too Large (total 1 request)", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "payload too large" }), {
          status: 413,
        })
      );

      const promise = apiFetch<{ result: string }>(
        "https://api.example.com/data"
      );

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(result.ok).toBe(false);
      fetchSpy.mockRestore();
    });

    it("AC-1.7: does NOT retry for 415 Unsupported Media Type (total 1 request)", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "unsupported" }), { status: 415 })
      );

      const promise = apiFetch<{ result: string }>(
        "https://api.example.com/data"
      );

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(result.ok).toBe(false);
      fetchSpy.mockRestore();
    });

    it("AC-1.8: RETRIES for 408 Request Timeout (total 2 requests)", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ error: "timeout" }), { status: 408 })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ data: "success" }), { status: 200 })
        );

      const promise = apiFetch<{ data: string }>(
        "https://api.example.com/data"
      );

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toBe("success");
      }
      fetchSpy.mockRestore();
    });

    it("AC-1.9: RETRIES for 429 Too Many Requests (total 2 requests)", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ error: "rate limited" }), {
            status: 429,
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ data: "ok" }), { status: 200 })
        );

      const promise = apiFetch<{ data: string }>(
        "https://api.example.com/data"
      );

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(result.ok).toBe(true);
      fetchSpy.mockRestore();
    });

    it("AC-1.10: RETRIES for 500 Server Error (total 2 requests)", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ error: "internal" }), { status: 500 })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ data: "recovered" }), { status: 200 })
        );

      const promise = apiFetch<{ data: string }>(
        "https://api.example.com/data"
      );

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(result.ok).toBe(true);
      fetchSpy.mockRestore();
    });

    it("AC-1.11: RETRIES for 502 Bad Gateway (total 2 requests)", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ error: "bad gateway" }), {
            status: 502,
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ data: "ok" }), { status: 200 })
        );

      const promise = apiFetch<{ data: string }>(
        "https://api.example.com/data"
      );

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(result.ok).toBe(true);
      fetchSpy.mockRestore();
    });

    it("AC-1.12: RETRIES for 503 Service Unavailable (total 2 requests)", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ error: "unavailable" }), {
            status: 503,
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ data: "ok" }), { status: 200 })
        );

      const promise = apiFetch<{ data: string }>(
        "https://api.example.com/data"
      );

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(result.ok).toBe(true);
      fetchSpy.mockRestore();
    });

    it("AC-1.13: RETRIES for 504 Gateway Timeout (total 2 requests)", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ error: "timeout" }), { status: 504 })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ data: "ok" }), { status: 200 })
        );

      const promise = apiFetch<{ data: string }>(
        "https://api.example.com/data"
      );

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(result.ok).toBe(true);
      fetchSpy.mockRestore();
    });

    it("AC-1.14: RETRIES for TypeError (network error) (total 2 requests)", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockRejectedValueOnce(new TypeError("Failed to fetch"))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ data: "recovered" }), { status: 200 })
        );

      const promise = apiFetch<{ data: string }>(
        "https://api.example.com/data"
      );

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(result.ok).toBe(true);
      fetchSpy.mockRestore();
    });
  });

  describe("apiFetch: retry interval", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("AC-2.1: waits 1000ms between first and second request on retry", async () => {
      const calls: number[] = [];
      vi.spyOn(globalThis, "fetch").mockImplementation(() => {
        calls.push(Date.now());
        if (calls.length === 1) {
          return Promise.resolve(
            new Response(JSON.stringify({ error: "timeout" }), { status: 408 })
          );
        }
        return Promise.resolve(
          new Response(JSON.stringify({ data: "ok" }), { status: 200 })
        );
      });

      const promise = apiFetch<{ data: string }>(
        "https://api.example.com/data"
      );

      await vi.advanceTimersByTimeAsync(500);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(500);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1);
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);

      const result = await promise;
      expect(result.ok).toBe(true);
    });
  });

  describe("apiFetch: Retry-After header handling", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("AC-2.2: respects Retry-After header when present (e.g., 5 seconds)", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ error: "rate limited" }), {
            status: 429,
            headers: { "Retry-After": "5" },
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ data: "ok" }), { status: 200 })
        );

      const promise = apiFetch<{ data: string }>(
        "https://api.example.com/data"
      );

      await vi.advanceTimersByTimeAsync(4999);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1);
      expect(fetchSpy).toHaveBeenCalledTimes(2);

      const result = await promise;
      expect(result.ok).toBe(true);
      fetchSpy.mockRestore();
    });

    it("AC-2.3: caps Retry-After to 60 seconds when header exceeds 60", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ error: "rate limited" }), {
            status: 429,
            headers: { "Retry-After": "120" },
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ data: "ok" }), { status: 200 })
        );

      const promise = apiFetch<{ data: string }>(
        "https://api.example.com/data"
      );

      await vi.advanceTimersByTimeAsync(59999);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1);
      expect(fetchSpy).toHaveBeenCalledTimes(2);

      const result = await promise;
      expect(result.ok).toBe(true);
      fetchSpy.mockRestore();
    });

    it("AC-2.4: uses 60000ms default when Retry-After header is absent on 429", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ error: "rate limited" }), {
            status: 429,
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ data: "ok" }), { status: 200 })
        );

      const promise = apiFetch<{ data: string }>(
        "https://api.example.com/data"
      );

      await vi.advanceTimersByTimeAsync(59999);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1);
      expect(fetchSpy).toHaveBeenCalledTimes(2);

      const result = await promise;
      expect(result.ok).toBe(true);
      fetchSpy.mockRestore();
    });
  });

  describe("apiFetch: timeout handling", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("AC-5.1: aborts request after 5000ms timeout", async () => {
      const abortSpy = vi.spyOn(AbortController.prototype, "abort");
      vi.spyOn(globalThis, "fetch").mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve(
                  new Response(JSON.stringify({ data: "late" }), {
                    status: 200,
                  })
                ),
              10000
            );
          })
      );

      const promise = apiFetch<{ data: string }>(
        "https://api.example.com/slow"
      );

      await vi.advanceTimersByTimeAsync(5000);
      const result = await promise;

      expect(abortSpy).toHaveBeenCalled();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("E_TIMEOUT");
      }
    });

    it("AC-5.2: ignores response that arrives after timeout (result not overwritten)", async () => {
      const resolveBox: { resolve: ((value: Response | PromiseLike<Response>) => void) | null } = {
        resolve: null,
      };

      vi.spyOn(globalThis, "fetch").mockImplementation(
        () =>
          new Promise<Response>((resolve) => {
            resolveBox.resolve = resolve;
          })
      );

      const promise = apiFetch<{ data: string }>(
        "https://api.example.com/data"
      );

      await vi.advanceTimersByTimeAsync(5000);
      const resultBox: { value: Result<{ data: string }> | null } = { value: null };
      promise.then((r) => {
        resultBox.value = r;
      });

      await vi.runAllTimersAsync();

      if (resolveBox.resolve) {
        resolveBox.resolve(new Response(JSON.stringify({ data: "late" }), { status: 200 }));
      }

      await vi.runAllTimersAsync();

      expect(resultBox.value).not.toBeNull();
      if (resultBox.value && !resultBox.value.ok) {
        expect(resultBox.value.error.code).toBe("E_TIMEOUT");
      }
    });
  });
});
