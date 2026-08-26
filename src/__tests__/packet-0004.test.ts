import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Import the fqd:v1 storage helpers (not yet implemented)
import { readArray, readObject, write } from "@/lib/fqd-storage";

describe("fqd:v1 localStorage 네임스페이스 헬퍼 + 자가복구", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // AC-1: readArray with malformed data should recover to default and warn once
  describe("AC-1: Malformed array recovery", () => {
    it("AC-1[P0]: should recover malformed array by overwriting with default value", () => {
      // Setup: localStorage에 malformed data (object instead of array) 저장
      localStorage.setItem("fqd:v1:notes", '{"a":1}');

      // Execute: readArray 호출
      const result = readArray("fqd:v1:notes", []);

      // Verify: 기본값 반환 + 저장소에 기본값으로 복구됨
      expect(result).toEqual([]);
      expect(localStorage.getItem("fqd:v1:notes")).toBe("[]");
    });

    it("AC-1[P0]: should warn exactly once when recovering malformed array", () => {
      // Setup
      localStorage.setItem("fqd:v1:notes", '{"a":1}');
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // Execute
      readArray("fqd:v1:notes", []);

      // Verify: console.warn이 정확히 1번 호출됨
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("fqd:v1:notes")
      );
    });

    it("should recover malformed array with custom default value", () => {
      // Setup: malformed data
      localStorage.setItem("fqd:v1:sessions", "not valid json");

      // Execute: custom default 사용
      const customDefault = ["session1"];
      const result = readArray("fqd:v1:sessions", customDefault);

      // Verify: custom default으로 복구됨
      expect(result).toEqual(customDefault);
      expect(localStorage.getItem("fqd:v1:sessions")).toBe(
        JSON.stringify(customDefault)
      );
    });
  });

  // AC-2: Other keys should remain intact when one key is recovered
  describe("AC-2: Isolation of key recovery", () => {
    it("AC-2[P1]: should not touch other keys when recovering one key", () => {
      // Setup: 여러 키에 데이터 저장
      const sessionsData = ["session1", "session2"];
      const profileData = { name: "John", age: 30 };
      const flagsData = { isPremium: true };

      localStorage.setItem("fqd:v1:notes", '{"a":1}'); // malformed
      localStorage.setItem("fqd:v1:sessions", JSON.stringify(sessionsData));
      localStorage.setItem("fqd:v1:profile", JSON.stringify(profileData));
      localStorage.setItem("fqd:v1:flags", JSON.stringify(flagsData));

      // Execute: notes 복구
      vi.spyOn(console, "warn").mockImplementation(() => {});
      readArray("fqd:v1:notes", []);

      // Verify: 다른 키들은 그대로 유지됨
      expect(JSON.parse(localStorage.getItem("fqd:v1:sessions")!)).toEqual(
        sessionsData
      );
      expect(JSON.parse(localStorage.getItem("fqd:v1:profile")!)).toEqual(
        profileData
      );
      expect(JSON.parse(localStorage.getItem("fqd:v1:flags")!)).toEqual(
        flagsData
      );
    });

    it("should recover multiple keys independently without affecting others", () => {
      // Setup: multiple malformed + valid keys
      const validRankCache = { user1: 100, user2: 200 };

      localStorage.setItem("fqd:v1:notes", "invalid");
      localStorage.setItem("fqd:v1:sessions", '{"bad": "object"}');
      localStorage.setItem("fqd:v1:rankCache", JSON.stringify(validRankCache));

      // Execute: notes and sessions 복구
      vi.spyOn(console, "warn").mockImplementation(() => {});
      readArray("fqd:v1:notes", []);
      readArray("fqd:v1:sessions", []);

      // Verify: rankCache는 손대지 않음
      expect(JSON.parse(localStorage.getItem("fqd:v1:rankCache")!)).toEqual(
        validRankCache
      );
    });
  });

  // AC-3: QuotaExceededError should return false without throwing
  describe("AC-3: QuotaExceededError handling", () => {
    it("AC-3[P0]: should return false on QuotaExceededError without throwing", () => {
      // Setup: Mock localStorage.setItem to throw QuotaExceededError
      const quotaError = new Error("QuotaExceededError");
      quotaError.name = "QuotaExceededError";

      const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw quotaError;
      });

      // Execute: write 호출
      const result = write("fqd:v1:notes", []);

      // Verify: false 반환 (exception 던지지 않음)
      expect(result).toBe(false);
      expect(setItemSpy).toHaveBeenCalled();
    });

    it("should not throw when QuotaExceededError occurs", () => {
      // Setup
      const quotaError = new Error("QuotaExceededError");
      quotaError.name = "QuotaExceededError";
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw quotaError;
      });

      // Execute & Verify: 예외가 던져지지 않음
      expect(() => {
        write("fqd:v1:notes", []);
      }).not.toThrow();
    });
  });

  // Additional tests for basic functionality
  describe("readArray: basic functionality", () => {
    it("should read valid array correctly", () => {
      // Setup
      const validArray = ["item1", "item2", "item3"];
      localStorage.setItem("fqd:v1:notes", JSON.stringify(validArray));

      // Execute
      const result = readArray("fqd:v1:notes", []);

      // Verify
      expect(result).toEqual(validArray);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
    });

    it("should return default value when key does not exist", () => {
      // Setup: 키가 없음
      // Execute
      const defaultArray = ["default1"];
      const result = readArray("fqd:v1:notes", defaultArray);

      // Verify: 기본값 반환하고 저장하지 않음
      expect(result).toEqual(defaultArray);
      expect(localStorage.getItem("fqd:v1:notes")).toBeNull();
    });

    it("should handle empty array correctly", () => {
      // Setup
      localStorage.setItem("fqd:v1:notes", "[]");

      // Execute
      const result = readArray("fqd:v1:notes", ["default"]);

      // Verify
      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });
  });

  describe("readObject: basic functionality", () => {
    it("should read valid object correctly", () => {
      // Setup
      const validObject = { name: "John", age: 30, email: "john@example.com" };
      localStorage.setItem("fqd:v1:profile", JSON.stringify(validObject));

      // Execute
      const result = readObject("fqd:v1:profile", {});

      // Verify
      expect(result).toEqual(validObject);
      expect(result.name).toBe("John");
      expect(result.age).toBe(30);
    });

    it("should recover malformed object by overwriting with default value", () => {
      // Setup: object 대신 array 저장
      localStorage.setItem("fqd:v1:profile", '["a","b"]');
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // Execute
      const defaultProfile = { name: "Unknown" };
      const result = readObject("fqd:v1:profile", defaultProfile);

      // Verify
      expect(result).toEqual(defaultProfile);
      expect(localStorage.getItem("fqd:v1:profile")).toBe(
        JSON.stringify(defaultProfile)
      );
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it("should return default value when key does not exist", () => {
      // Setup: 키가 없음
      // Execute
      const defaultObject = { default: true };
      const result = readObject("fqd:v1:profile", defaultObject);

      // Verify: 기본값 반환하고 저장하지 않음
      expect(result).toEqual(defaultObject);
      expect(localStorage.getItem("fqd:v1:profile")).toBeNull();
    });
  });

  describe("write: basic functionality", () => {
    it("should write array data successfully", () => {
      // Setup
      const arrayData = ["note1", "note2"];

      // Execute
      const result = write("fqd:v1:notes", arrayData);

      // Verify
      expect(result).toBe(true);
      expect(JSON.parse(localStorage.getItem("fqd:v1:notes")!)).toEqual(
        arrayData
      );
    });

    it("should write object data successfully", () => {
      // Setup
      const objectData = { theme: "dark", notifications: true };

      // Execute
      const result = write("fqd:v1:flags", objectData);

      // Verify
      expect(result).toBe(true);
      expect(JSON.parse(localStorage.getItem("fqd:v1:flags")!)).toEqual(
        objectData
      );
    });

    it("should return true on successful write", () => {
      // Setup & Execute
      const result = write("fqd:v1:rankCache", { user: 100 });

      // Verify
      expect(result).toBe(true);
    });

    it("should overwrite existing data", () => {
      // Setup
      const oldData = ["old"];
      const newData = ["new", "data"];
      localStorage.setItem("fqd:v1:notes", JSON.stringify(oldData));

      // Execute
      write("fqd:v1:notes", newData);

      // Verify
      expect(JSON.parse(localStorage.getItem("fqd:v1:notes")!)).toEqual(
        newData
      );
    });
  });

  describe("Edge cases and integration", () => {
    it("should handle rapid successive writes without data loss", () => {
      // Execute: 여러 번 쓰기
      write("fqd:v1:notes", ["a"]);
      write("fqd:v1:notes", ["b"]);
      write("fqd:v1:notes", ["a", "b", "c"]);

      // Verify: 마지막 값만 저장됨
      expect(JSON.parse(localStorage.getItem("fqd:v1:notes")!)).toEqual([
        "a",
        "b",
        "c",
      ]);
    });

    it("should handle null and undefined in data correctly", () => {
      // Setup
      const objectWithNulls = { a: null, b: undefined, c: "value" };

      // Execute
      write("fqd:v1:profile", objectWithNulls);

      // Verify
      const retrieved = readObject("fqd:v1:profile", {});
      expect(retrieved.a).toBeNull();
      expect(retrieved.c).toBe("value");
    });

    it("should preserve fqd:v1: namespace constraint across all operations", () => {
      // Execute: write to fqd:v1: prefixed keys
      write("fqd:v1:notes", ["a"]);
      write("fqd:v1:sessions", ["b"]);
      write("fqd:v1:profile", { x: 1 });

      // Verify: 모두 fqd:v1: 접두어로 저장됨
      expect(localStorage.getItem("fqd:v1:notes")).not.toBeNull();
      expect(localStorage.getItem("fqd:v1:sessions")).not.toBeNull();
      expect(localStorage.getItem("fqd:v1:profile")).not.toBeNull();
    });
  });
});
