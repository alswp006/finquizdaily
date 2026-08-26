# Test Expectations for packet-heal-1-01 (스토리지/데이터 로더 방어적 정규화)

## Test File Location
- `src/__tests__/packet-heal-1-01.test.ts` ✓ (Already written)

## Required Implementations

### 1. `src/lib/storage.ts`

Expected exports and signatures:

```typescript
/**
 * Generic storage getter with defensive normalization
 * - Reads from localStorage
 * - JSON.parse with try/catch protection
 * - Returns defaultValue if parsing fails, value is null/undefined, or type mismatch
 * - For objects: merges parsed data with defaultValue using {...defaultValue, ...parsed}
 * - For array fields: enforces Array.isArray() or returns []
 */
export function getItem<T>(key: string, defaultValue: T): T

/**
 * Generic storage setter
 */
export function setItem<T>(key: string, value: T): void

/**
 * Remove item from localStorage
 */
export function removeItem(key: string): void

/**
 * Default quiz state (used as fallback in getItem)
 */
export const DEFAULT_QUIZ_STATE: QuizState

/**
 * Default questions list (used as fallback for loadQuestions)
 */
export const DEFAULT_QUESTIONS: Question[]
```

### 2. `src/lib/quizState.ts`

Expected exports and signatures:

```typescript
/**
 * Load quiz state from localStorage with defensive normalization
 * - Uses storage.getItem() internally with DEFAULT_QUIZ_STATE
 * - Ensures all collection fields (dailyProgress, wrongAnswers, weeklyRecords) are arrays
 */
export function loadQuizState(): QuizState

/**
 * Load questions from localStorage or default
 * - Uses storage.getItem() internally with DEFAULT_QUESTIONS
 * - Parses from questions.json or storage
 */
export function loadQuestions(): Question[]
```

### 3. `src/data/questions.json`

Expected structure:

```json
[
  {
    "id": "q1",
    "question": "문제 텍스트",
    "options": [
      { "id": "opt1", "text": "선택지 1", "isCorrect": false },
      { "id": "opt2", "text": "선택지 2", "isCorrect": true }
    ],
    "explanation": "설명"
  }
]
```

### 4. `src/lib/types.ts`

Required type definitions (import these in storage.ts and quizState.ts):

```typescript
interface QuizState {
  completed: boolean;
  dailyProgress: DailyProgress[];      // ← Must be enforced as array
  wrongAnswers: WrongAnswer[];          // ← Must be enforced as array
  weeklyRecords: WeeklyRecord[];        // ← Must be enforced as array
  // ... other fields as needed
}

interface DailyProgress {
  date: string;
  count: number;
  // ... other fields
}

interface WrongAnswer {
  questionId: string;
  // ... other fields
}

interface WeeklyRecord {
  week: number;
  count: number;
  // ... other fields
}

interface Question {
  id: string;
  question: string;
  options: QuestionOption[];
  explanation?: string;
  // ... other fields
}

interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}
```

## Test Behavior Expectations

### AC-1: Empty localStorage returns defaults, no crash
- When localStorage is empty, `getItem("quiz-state", DEFAULT_QUIZ_STATE)` returns `DEFAULT_QUIZ_STATE`
- All required fields are defined on the returned object
- `loadQuestions()` returns a non-empty array
- No exceptions thrown

### AC-2: Corrupted data recovery
- Corrupted JSON (e.g., `"{invalid json"`) → returns defaultValue, **no console.error**
- `null` or `undefined` in storage → returns defaultValue
- Partial schema (missing fields) → merges with defaults: `{...DEFAULT_STATE, ...parsed}`
- Saved values override defaults when present
- Roundtrip works: `setItem(key, val)` then `getItem(key, default)` returns `val`

### AC-3: Collections always arrays
- Collection fields (dailyProgress, wrongAnswers, weeklyRecords) are **never null/undefined**
- `Array.isArray(result.fieldName)` is always `true`
- Non-array values (objects, strings, numbers) → converted to `[]`
- Array.isArray() check is applied during normalization in `getItem()`

## Path Alias Setup
Tests use `@/lib/storage` and `@/lib/quizState`. This requires:

### vite.config.ts
```typescript
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

## Normalization Logic Details

### Merge Strategy for Partial Schemas
```typescript
// If saved is { completed: true }, defaults are { completed: false, dailyProgress: [] }
const result = { ...DEFAULT_QUIZ_STATE, ...parsed };
// Result: { completed: true, dailyProgress: [], ... }
```

### Array Enforcement
```typescript
// Applied to all collection fields after merge:
const dailyProgress = Array.isArray(parsed.dailyProgress) ? parsed.dailyProgress : [];
const wrongAnswers = Array.isArray(parsed.wrongAnswers) ? parsed.wrongAnswers : [];
const weeklyRecords = Array.isArray(parsed.weeklyRecords) ? parsed.weeklyRecords : [];
```

### Try/Catch Pattern
```typescript
function getItem<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return defaultValue;
    
    const parsed = JSON.parse(stored);
    if (typeof parsed !== typeof defaultValue) return defaultValue;
    
    // Merge + enforce arrays
    return { ...defaultValue, ...parsed };
  } catch (e) {
    // NO console.error — return silently
    return defaultValue;
  }
}
```

## Test Commands
```bash
# Run all tests
npx vitest run

# Run this specific test file
npx vitest run src/__tests__/packet-heal-1-01.test.ts

# Watch mode
npx vitest watch
```

## Notes
- Tests import from `@/lib/storage` and `@/lib/quizState` (path alias required)
- All 16 tests should PASS once implementation is complete
- No Intl.DateTimeFormat, structuredClone, Object.groupBy, or Array.prototype.at (per CLAUDE.md)
- console.error must be 0 for AC-2 tests
