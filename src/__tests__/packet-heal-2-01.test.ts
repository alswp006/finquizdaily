import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * 엔트리·임포트 그래프 정적 복구 (빌드 0 modules 원인 제거)
 *
 * AC-1: `npx vite build`가 성공하고 로그의 transformed 모듈 수가 0이 아니다
 * AC-2: `npx tsc --noEmit`이 에러 0건
 * AC-3: src/ 내 모든 import가 실제 파일로 해석되며 미해결 모듈 경고가 0건
 * AC-4: build.target이 es2019이고 금지된 모던 API 사용이 0건
 */

const ROOT = path.resolve(__dirname, "../..");
const SRC = path.resolve(ROOT, "src");

function listSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  let files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "__tests__" || entry === "node_modules") continue;
      files = files.concat(listSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith(".d.ts")) {
      files.push(full);
    }
  }
  return files;
}

const RESOLVE_EXTENSIONS = ["", ".ts", ".tsx", ".js", ".jsx", ".json"];

function resolveModulePath(basePath: string): string | null {
  for (const ext of RESOLVE_EXTENSIONS) {
    const candidate = basePath + ext;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  for (const ext of [".ts", ".tsx", ".js", ".jsx"]) {
    const candidate = path.join(basePath, "index" + ext);
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function findUnresolvedImports(): { file: string; specifier: string }[] {
  const files = listSourceFiles(SRC);
  const importRegex = /(?:import|export)(?:[^'"]*?from\s*)?['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)/g;
  const unresolved: { file: string; specifier: string }[] = [];

  for (const file of files) {
    const content = readFileSync(file, "utf-8");
    let match: RegExpExecArray | null;
    importRegex.lastIndex = 0;
    while ((match = importRegex.exec(content)) !== null) {
      const specifier = match[1] || match[2];
      if (!specifier) continue;
      if (!specifier.startsWith(".") && !specifier.startsWith("@/")) continue; // skip bare package specifiers

      let basePath: string;
      if (specifier.startsWith("@/")) {
        basePath = path.join(SRC, specifier.slice(2));
      } else {
        basePath = path.resolve(path.dirname(file), specifier);
      }

      const resolved = resolveModulePath(basePath);
      if (!resolved) {
        unresolved.push({ file: path.relative(ROOT, file), specifier });
      }
    }
  }
  return unresolved;
}

describe("엔트리·임포트 그래프 정적 복구 (빌드 0 modules 원인 제거)", () => {
  describe("AC-1[P0]: vite build가 성공하고 모듈이 0건이 아니다", () => {
    it("should run `npx vite build` successfully and transform more than 0 modules", () => {
      let output = "";
      let threw = false;
      try {
        output = execSync("npx vite build --logLevel info", {
          cwd: ROOT,
          encoding: "utf-8",
          stdio: ["ignore", "pipe", "pipe"],
        });
      } catch (err) {
        threw = true;
        output = (err as { stdout?: string }).stdout ?? String(err);
      }

      expect(threw).toBe(false);

      const match = output.match(/(\d+)\s+modules transformed/);
      expect(match).not.toBeNull();
      const moduleCount = match ? parseInt(match[1], 10) : 0;
      expect(moduleCount).toBeGreaterThan(0);
    }, 60000);

    it("should produce a dist/index.html and a non-external entry bundle", () => {
      const distIndex = path.join(ROOT, "dist", "index.html");
      expect(existsSync(distIndex)).toBe(true);

      const html = readFileSync(distIndex, "utf-8");
      // bare specifier가 첫 줄에 남아있으면 흰 화면 (external 설정 실수)
      expect(html).not.toContain("@apps-in-toss/web-framework");
      expect(html).toContain('<div id="root">');
    }, 60000);
  });

  describe("AC-2[P0]: tsc --noEmit 에러 0건", () => {
    it("should run `npx tsc --noEmit` with zero type errors", () => {
      let output = "";
      let exitCode = 0;
      try {
        output = execSync("npx tsc --noEmit", {
          cwd: ROOT,
          encoding: "utf-8",
          stdio: ["ignore", "pipe", "pipe"],
        });
      } catch (err) {
        exitCode = (err as { status?: number }).status ?? 1;
        output = (err as { stdout?: string }).stdout ?? String(err);
      }

      expect(exitCode).toBe(0);
      expect(output.trim()).toBe("");
    }, 60000);
  });

  describe("AC-3: src/ 내 모든 import가 실제 파일로 해석됨", () => {
    it("should have zero unresolved relative or @/-aliased imports in src/", () => {
      const unresolved = findUnresolvedImports();

      expect(unresolved).toEqual([]);
      expect(unresolved.length).toBe(0);
    });

    it("index.html should reference an existing entry module (src/main.tsx)", () => {
      const html = readFileSync(path.join(ROOT, "index.html"), "utf-8");
      const scriptMatch = html.match(/<script[^>]*type="module"[^>]*src="([^"]+)"/);
      expect(scriptMatch).not.toBeNull();

      const entrySrc = scriptMatch![1].replace(/^\//, "");
      const entryPath = path.join(ROOT, entrySrc);
      expect(existsSync(entryPath)).toBe(true);
    });
  });

  describe("AC-4: build.target=es2019, 금지 API 미사용", () => {
    it("vite.config.ts should set build.target to es2019", () => {
      const viteConfig = readFileSync(path.join(ROOT, "vite.config.ts"), "utf-8");
      const targetMatch = viteConfig.match(/target:\s*['"]([^'"]+)['"]/);

      expect(targetMatch).not.toBeNull();
      expect(targetMatch![1]).toBe("es2019");
    });

    it("should declare a browserslist targeting Android >= 7 and iOS >= 16", () => {
      const packageJson = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf-8"));
      const browserslistrcPath = path.join(ROOT, ".browserslistrc");

      let declared: string[] | null = null;
      if (Array.isArray(packageJson.browserslist)) {
        declared = packageJson.browserslist;
      } else if (existsSync(browserslistrcPath)) {
        declared = readFileSync(browserslistrcPath, "utf-8")
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.length > 0 && !l.startsWith("#"));
      }

      expect(declared).not.toBeNull();
      expect(declared).toContain("Android >= 7");
      expect(declared).toContain("iOS >= 16");
    });

    it("should not use Array.prototype.at/Object.groupBy/structuredClone/Intl timeZone option in src/", () => {
      const files = listSourceFiles(SRC);
      const offenders: { file: string; api: string }[] = [];
      const forbidden: [RegExp, string][] = [
        [/\.at\(\s*-?\d+\s*\)/, "Array.prototype.at"],
        [/Object\.groupBy\(/, "Object.groupBy"],
        [/structuredClone\(/, "structuredClone"],
        [/timeZone\s*:/, "Intl.DateTimeFormat({ timeZone })"],
      ];

      for (const file of files) {
        const content = readFileSync(file, "utf-8");
        for (const [regex, name] of forbidden) {
          if (regex.test(content)) {
            offenders.push({ file: path.relative(ROOT, file), api: name });
          }
        }
      }

      expect(offenders).toEqual([]);
      expect(offenders.length).toBe(0);
    });
  });
});
