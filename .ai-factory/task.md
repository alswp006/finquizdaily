# TASK (updated)

> SPEC Part 2/3(F6 AC‑6~12, F7, F8, F9) **+ PRD 기반 Part 1 커버리지 보강**. 총 **29 패킷**, 각 패킷 ≤10분.
> 전제: 템플릿 제공분(TDS 세팅, `AdSlot`, `TossRewardAd`, `TossPurchase`, `FloatingTabBar`, localStorage 헬퍼 골격, 토스 로그인 자동)은 작업 범위 밖.
> 변경 표기: **[신규]** = 이번 갭 보강으로 추가, **[수정]** = 기존 패킷 DoD/의존성 보강, 무표기 = 기존 유지.

---

## 0. 이번 개정에서 메운 갭 (요약)

| 갭 | 조치 |
|---|---|
| PRD F1~F5(매일 3문제, 스트릭/뱃지, 리워드 광고 심화 해설) → TASK 미커버 | Task 1.3, 2.10~2.14, 3.6~3.8 **신규 9패킷** 추가 |
| F6‑AC‑1~5(오답 자동 적재·빈 상태) 미커버 | Task 2.13 신규 + Task 3.1 DoD 보강 |
| 라우팅 등록이 Part 2 라우트만 (`/`, `/daily`, `/daily/result` 누락 → 딥링크 404) | Task 4.2 **[수정]** — 8개 라우트로 확장 |
| Task 4.1 의존성이 `3.1~3.5`로 모호 | 명시적 태스크 목록으로 교체 **[수정]** |
| 동일 파일 다중 수정(파일 충돌) 미검증 | §5 **File Conflict Map** 신설, 모든 중복 파일에 선후 의존성 명시 |
| 레이어 순서(Data → API → UI → 통합) 미확인 | §4 **실행 순서 DAG** 신설 |
| 점수 공식·뱃지 목록 등 Part 1 확정 필요 사항 | §6 **Open Questions**로 분리 (임의 확정 금지, 상수 1곳 격리로 대응) |

---

## Epic 1. TypeScript 타입 + 인터페이스 (런타임 코드 0줄)

**Risk Assessment**
- **Complexity**: Low
- **Risk factors**: `RouteState`가 없으면 `/share`·`/daily/result` 진입 시 `location.state`를 페이지마다 제멋대로 캐스팅 → 새로고침/딥링크에서 `undefined` 크래시. 에러 코드 문자열이 페이지마다 하드코딩되면 F9‑AC‑1의 "정확히 일치" 검증이 깨짐. 문항 은행 스키마가 늦게 확정되면 2.10/2.13/3.7이 동시에 막힘.
- **Mitigation**: 엔티티 타입 + `RouteState` + Error Catalog + 문항 은행을 **가장 먼저** 확정해 이후 모든 패킷이 import만 하게 만든다. 카탈로그·은행을 `as const` 단일 소스로 두어 불일치를 컴파일 타임에 차단.

### Task 1.1 도메인 타입 + RouteState 정의 **[수정]**
- **Description**: `Question`, `Note`, `DailySession`, `Profile`, `Badge`, `Flags`, `DeepExplainState`, `RankCache`, `RankEntry`, `Result<T>` 및 **`RouteState`** 를 순수 타입으로 정의. 런타임 코드(함수/상수 값) 금지, `export type`/`export interface`만.
- **핵심 정의**:
  ```ts
  export type RouteState = {
    "/": undefined;
    "/daily": undefined;
    "/daily/result": { dateKey: string } | undefined;
    "/notes": undefined;
    "/notes/:questionId": undefined;
    "/rank": undefined;
    "/share": { dateKey: string } | undefined;
  };
  export type Result<T> = { ok: true; value: T } | { ok: false; error: AppError };
  export type Flags = {
    rankOptIn: boolean;
    rankDisabledReason: null | "unauthenticated" | "forbidden" | "unavailable";
    lastShareAt: number | null;
    deepExplainUnlockedDateKey: string | null;
  };
  export type RankCache = { weekKey: string; stale: boolean; entries: RankEntry[]; me: { rank: number; total: number; score: number } | null };
  ```
- **DoD**:
  - `npx tsc --noEmit` 통과, 파일 내 `function`/`const` 값 선언 **0건**.
  - `Question`은 `id: string`, `category: string`, `text: string`, `choices: string[]`, `answerIndex: number`, `explanation: string`, `deepExplanation: string` 포함.
  - `Note`는 `questionId: string`, `status: "todo" | "done"`, `reviewedAt: number | null`, `createdAt: number` 포함.
  - `DailySession`은 `dateKey`, `answers: number[]`, `score: number`, `status: "in_progress" | "completed"` 포함.
  - `Profile`은 `userKey`, `nickname`, `totalScore`, `streak`, `lastCompletedDateKey: string | null`, `badges: Badge[]`, `noteDoneCount: number` 포함.
  - `Badge`는 `"note_master"`를 포함한 문자열 리터럴 유니온(추가 뱃지는 §6 확정 후 유니온만 확장).
  - `RouteState`에 `/share`·`/daily/result` 키가 존재하고 각각 `| undefined` 유니온 포함(state 없이 진입 가능함을 타입으로 명시).
- **Covers**: (기반 타입 — 전 AC 공통)
- **Files**: `src/lib/types.ts`
- **Depends on**: none

### Task 1.2 Error Catalog + AppError 타입
- **Description**: `AppError` 타입과 Error Catalog 상수 테이블(`code → { httpStatus, userMessage }`) 정의. SPEC에 등장하는 모든 코드를 빠짐없이 포함.
- **포함 코드**: `E_VALIDATION`(400), `E_TYPE_MISMATCH`(400), `E_UNAUTHENTICATED`(401), `E_FORBIDDEN`(403), `E_NOT_FOUND`(404), `E_TIMEOUT`(408), `E_CONFLICT_DUPLICATE`(409), `E_CONFLICT_STATE`(409), `E_LIMIT_EXCEEDED`(400), `E_SCHEMA_INVALID`(422), `E_RATE_LIMITED`(429), `E_SERVER`(500), `E_UNAVAILABLE`(503), `E_OFFLINE`(0), `E_CLIPBOARD_FAILED`(0).
- **DoD**:
  - `ERROR_CATALOG`가 `as const`로 선언되고, `userMessage` 문자열이 SPEC 표기와 **문자 단위로 동일**(예: `"서버에 문제가 생겼어요. 잠시 후 다시 시도해주세요"`, `"요청이 많아요. 잠시 후 다시 시도해주세요"`, `"인터넷 연결을 확인해주세요"`, `"랭킹 서버 점검 중이에요"`, `"입력값을 다시 확인해주세요"`).
  - `AppError = { code: ErrorCode; httpStatus: number; userMessage: string; field?: string; context?: string }`.
  - 카탈로그 키 개수 **15개**, `tsc --noEmit` 통과.
- **Covers**: [F9-AC-1(문구 소스), F9-AC-8(문구 소스)]
- **Files**: `src/lib/errorCatalog.ts`
- **Depends on**: none

### Task 1.3 문항 은행 시드 데이터 **[신규]**
- **Description**: `Question[]` 시드 데이터를 `as const` 배열로 정의. 로직 없음(순수 데이터 + 조회 인덱스 1개).
- **DoD**:
  - `QUESTION_BANK`가 **30문항 이상**, 모든 `id`가 `/^q-\d{3}$/`에 매치하고 **중복 0건**(테스트로 `new Set(ids).size === ids.length` 검증).
  - 모든 문항의 `choices.length === 4`, `0 <= answerIndex <= 3`, `explanation.length >= 20`, `deepExplanation.length >= 60`(전 문항 순회 테스트).
  - `getQuestion(id): Question | null` — 은행에 없으면 **throw 없이 `null`** 반환(`q-999` 케이스).
  - `category` 값이 사전 정의된 리터럴 유니온에 속함, `tsc --noEmit` 통과.
  - 네트워크·스토리지 접근 0건.
- **Covers**: [F1(문항 소스), F6-AC-6·AC-9의 은행 대조 기준]
- **Files**: `src/data/questionBank.ts`
- **Depends on**: Task 1.1

---

## Epic 2. 데이터 레이어 (스토리지 · 스키마 가드 · 네트워크 · 도메인 로직)

**Risk Assessment**
- **Complexity**: High
- **Risk factors**: (1) `fqd:v1:notes`가 배열이 아닐 때 복구 로직이 다른 키까지 지우면 F6‑AC‑12 위반(세션/프로필 유실). (2) 재시도 정책이 상태코드별로 다른데 한 함수에 섞이면 400에도 2회 요청이 나가 F7‑AC‑9/10 실패. (3) 타임아웃 후 늦게 도착한 응답이 상태를 덮어써 F9‑AC‑3 위반. (4) 점수 클램프를 UI에서 하면 우회 경로 발생. (5) **신규**: 데일리 완료·스트릭·노트 적재가 서로 다른 곳에서 상태를 쓰면 새로고침 시 이중 적재(노트 중복·스트릭 2 증가).
- **Mitigation**: storage(2.1) → schema guard(2.2) → error map(2.3) → apiFetch(2.4) → 날짜/점수(2.5) → 도메인(2.6~2.14) 순으로 **아래에서 위로** 쌓아 각 계층을 단독 테스트 가능하게 만든다. 재시도 판단은 `apiFetch` 한 곳에만, 클램프는 `rankApi` 진입점에서만, 완료 부작용(점수·스트릭·노트·제출)은 `completeDaily`(4.3) 한 곳에서만 수행한다.

### Task 2.1 localStorage 네임스페이스 헬퍼 + 자가복구
- **Description**: `fqd:v1:*` 키 전용 안전 read/write 유틸. JSON 파싱 실패·타입 불일치 시 **해당 키만** 기본값으로 재초기화.
- **DoD**:
  - `readArray<T>(key, fallback)`: 값이 배열이 아니면(`"{\"a\":1}"` 등) 해당 키를 `"[]"`로 덮어쓰고 `[]` 반환 + `console.warn` **정확히 1건**.
  - 위 복구 시 `fqd:v1:sessions`, `fqd:v1:profile`이 삭제되지 않음(단위 테스트로 잔존 확인).
  - `readObject`, `write`, `KEYS = { notes, sessions, profile, flags, rankCache }` export.
  - QuotaExceededError 발생 시 throw하지 않고 `false` 반환.
- **Covers**: [F6-AC-12]
- **Files**: `src/lib/storage.ts`
- **Depends on**: Task 1.1

### Task 2.2 런타임 스키마 가드 (`parseX`) **[수정]**
- **Description**: 예외를 던지지 않고 `Result<T>`를 반환하는 화이트리스트 파서: `parseSession`, `parseNote`, `parseProfile`, `parseRankEntry`, `parseLeaderboardResponse`.
- **DoD**:
  - 필수 키 누락 → `"E_VALIDATION"`(400), 타입 불일치 → `"E_TYPE_MISMATCH"`(400), 범위 초과/구조 위반 → `"E_SCHEMA_INVALID"`(422). 세 케이스 모두 `throw` **0건**.
  - 성공 시 반환 객체에 스키마 외 키가 없음(`Object.keys` 비교 테스트).
  - `parseSession`: `answers`가 배열이 아니거나 원소에 정수 아님/`-1` 미만/`3` 초과 값이 있으면 `E_SCHEMA_INVALID`(422).
  - **[신규 DoD]** `parseProfile`: `streak`이 음수이거나 `badges`가 배열이 아니면 `E_SCHEMA_INVALID`(422), 성공 시 `badges`는 알려진 리터럴만 남기고 필터링.
  - `parseLeaderboardResponse`: `entries`가 배열이 아니면 `E_SCHEMA_INVALID`(422) 실패 반환; 배열이면 **항목 단위 필터링**해 유효 항목 배열 + 제외 건수 반환.
- **Covers**: [F9-AC-4, F7-AC-20, F6-AC-12(세션/프로필 방어)]
- **Files**: `src/lib/schema.ts`
- **Depends on**: Task 1.1, Task 1.2

### Task 2.3 `mapHttpError` + 로깅 포맷
- **Description**: HTTP status(+body)를 `AppError`로 매핑하는 순수 함수와 고정 포맷 로거 `logAppError`.
- **DoD**:
  - `400/401/403/404/408/409/413/415/422/429/500/502/503/504/0` 입력 시 모두 `AppError` 반환, `undefined` **0건**.
  - 미매핑 status(예: `418`) → `E_SERVER`, `httpStatus: 500`.
  - 반환 `userMessage`가 `ERROR_CATALOG[code].userMessage`와 `===`로 일치(전 코드 순회 테스트).
  - `logAppError(err, context)`는 `console.warn("[FQD] {code} {httpStatus} {context}")` **단일 문자열 1회** 호출. 서버 `body.message`, `userKey`, 닉네임은 포함되지 않음.
  - 서버 `message` 필드는 `AppError.userMessage`에 절대 대입되지 않음(별도 테스트).
- **Covers**: [F9-AC-1, F9-AC-9, F9-AC-8(비노출 보장)]
- **Files**: `src/lib/errors.ts`
- **Depends on**: Task 1.2

### Task 2.4 `apiFetch` (타임아웃 · 재시도 · 오프라인)
- **Description**: `AbortController` 기반 5000ms 타임아웃, 상태코드별 재시도 정책을 가진 fetch 래퍼. 반환은 `Result<T>`.
- **DoD**:
  - 요청 총 횟수: `400/401/403/404/409/413/415` → **1회**, `408/429/500/502/503/504`·`TypeError: Failed to fetch` → **2회**.
  - 재시도 간격 1000ms. `429`는 `Retry-After` 헤더 우선, 헤더 없음/60 초과 시 **60000ms로 캡**.
  - 5000ms 시점 `abort()` → `E_TIMEOUT`(408) 반환. 이후 도착한 지연 응답은 결과에 반영되지 않음(플래그 테스트).
  - `navigator.onLine === false`이면 `fetch` 호출 **0회**, 즉시 `E_OFFLINE`(0) 반환.
  - 어떤 경로에서도 `console.error` **0건**.
  - 전체 소요 시간 상한 12000ms 내 종료.
- **Covers**: [F9-AC-2, F9-AC-3, F7-AC-16, F7-AC-17, F7-AC-19]
- **Files**: `src/lib/apiFetch.ts`
- **Depends on**: Task 2.3

### Task 2.5 날짜 키(KST) + 주차 키 + 점수 클램프 유틸 **[수정]**
- **Description**: `getDateKey(date): "YYYY-MM-DD"`(KST), `getWeekKey(date): "YYYY-Www"`(KST, 월~일), `diffDays(a, b)`, `sumWeeklyScore(sessions, weekKey)`, `clampScore(n)`, `clampLimit(n)` 순수 함수.
- **DoD**:
  - **[신규 DoD]** `getDateKey`가 KST 기준으로 산출됨: UTC `2026-08-25T15:00:00Z` → `"2026-08-26"`, UTC `2026-08-25T14:59:59Z` → `"2026-08-25"`.
  - **[신규 DoD]** `diffDays("2026-08-25", "2026-08-26") === 1`, `diffDays("2026-08-26","2026-08-26") === 0`, 월말 경계(`"2026-08-31"`→`"2026-09-01"`) `=== 1`.
  - `getWeekKey`가 KST 월요일 00:00에 주차 전환(일요일 23:59 / 월요일 00:01 경계 테스트 통과).
  - `clampScore(554) === 553`이며 `console.warn("[FQD] E_LIMIT_EXCEEDED score")` **1건**만 출력. `clampScore(-1) === 0`(동일 warn 1건). 범위 내 값은 warn **0건**.
  - `clampLimit(0) === 1`, `clampLimit(999) === 50`, 클램프 시 warn 1건. `clampLimit(50)`은 warn 0건.
  - 순수 함수(스토리지·네트워크 접근 0건).
- **Covers**: [F7-AC-7, F7-AC-21(클라이언트 클램프), F7-AC-6(weekKey 산출), F2(스트릭 날짜 기반)]
- **Files**: `src/lib/week.ts`, `src/lib/score.ts`
- **Depends on**: Task 1.1

### Task 2.6 랭킹 API 클라이언트 (`submitScore` / `fetchLeaderboard`)
- **Description**: `apiFetch` 위에 랭킹 도메인 규칙을 얹은 클라이언트. 사전 검증 → 클램프 → 호출 → 상태코드별 후처리(`RankCache`/`Flags` 갱신). UI 상태는 반환값으로만 전달.
- **DoD**:
  - `submitScore`: `POST /v1/scores`, 헤더 `X-User-Key: profile.userKey`, 바디 `{ userKey, nickname, weekKey, score, streak }`로 **정확히 1회** 호출. 200 `{rank,total}` → `RankCache.me.rank` 저장 + `stale: false`.
  - `score`가 `number`가 아니면(`"137"`) **네트워크 호출 0회**로 `E_TYPE_MISMATCH`(400, field: `"score"`) 반환.
  - `rankOptIn === false` 또는 `VITE_LEADERBOARD_API_BASE`가 빈 문자열/`https://` 미시작 → 두 함수 모두 네트워크 호출 **0회**, `{ mode: "local" }` 반환, `console.warn`·`console.error` 0건.
  - 400 `INVALID_PAYLOAD`/`INVALID_TYPE`/`INVALID_LIMIT` → 재시도 0회, `RankCache` 미갱신, `E_VALIDATION` 반환 + 서버 `message`는 `console.warn`에만 기록.
  - 401 → 재시도 0회, `rankOptIn = false`, `rankDisabledReason = "unauthenticated"` 저장, 이후 자동 재제출 0회.
  - 403 → 재시도 0회, `RankCache` 미갱신, `rankDisabledReason = "forbidden"`, 로컬 `userKey` 재동기화만(자동 재요청 0회).
  - 409 `DUPLICATE_SUBMISSION` → 응답 `rank/total`로 캐시 갱신, 에러 반환 없음, `console.warn("[FQD] E_CONFLICT_DUPLICATE scores")` 1건.
  - 409 `SCORE_REGRESSION` → `RankCache.me.score = 200`, `rank = 8` 서버 값 채택, `Profile.totalScore` 불변.
  - 503(2회 실패) → `rankDisabledReason = "unavailable"`, 세션 내 자동 재조회 0회 플래그 설정.
  - 500(2회 실패)·타임아웃·오프라인 → 캐시가 있으면 `RankCache.stale = true`로 표시해 반환.
  - 200이지만 `parseLeaderboardResponse` 실패 → `RankCache` **덮어쓰지 않고** `E_SCHEMA_INVALID`(422) 반환.
- **Covers**: [F7-AC-1, F7-AC-4, F7-AC-9~12, F7-AC-14, F7-AC-15, F7-AC-18, F7-AC-20~22]
- **Files**: `src/lib/rankApi.ts`
- **Depends on**: Task 2.1, Task 2.2, Task 2.4, Task 2.5

### Task 2.7 오답노트 도메인 스토어 — 정제/복습/뱃지
- **Description**: 노트 정제(고아 참조 제거)·복습 처리(중복 방지)·뱃지 카운트 로직.
- **DoD**:
  - `sanitizeNotes(notes, questionBank)`: 은행에 없는 `questionId`(예: `"q-999"`) 행 제거 후 `fqd:v1:notes`에 저장, `{ notes, removedCount }` 반환. N건 제거 시에도 반환은 `removedCount: N` **하나**(호출 측 Toast 1회 보장). `console.error` 0건.
  - `markReviewed(questionId, isCorrect)`: 대상이 이미 `status: "done"`이면 `reviewedAt` 미갱신, `doneCount` 미증가, `{ duplicated: true }` 반환 + `console.warn("[FQD] E_CONFLICT_DUPLICATE notes ...")` 1건.
  - 신규 완료 시 `status: "done"`, `reviewedAt` 갱신, `doneCount` 반환하며 `doneCount === 20`인 **그 호출에서만** `{ unlockedBadge: "note_master" }` 반환(21번째부터 `null`).
  - 뱃지 해금 여부는 `Profile.badges`에 영구 저장되어 재호출 시 중복 해금 0건.
- **Covers**: [F6-AC-6(데이터 정제), F6-AC-8, F6-AC-11]
- **Files**: `src/lib/notesStore.ts`
- **Depends on**: Task 2.1, Task 2.2

### Task 2.8 공유 텍스트 빌더
- **Description**: `buildShareText({ session, profile, rankCache, todayWeekKey })` 순수 함수.
- **DoD**:
  - 정상 입력 시 반환값이 정확히 `"FinQuizDaily 2026-08-26\n⭕️❌⭕️  2/3\n오늘 38점 · 4일 연속 🔥"`(문자열 동등 비교 테스트).
  - `rankOptIn === true` && `rankCache.me != null` && `rankCache.weekKey === todayWeekKey`일 때만 마지막 줄 `"이번 주 12위 / 340명"` 추가. `me === null`이거나 주차 불일치면 줄 **생략**, 에러 반환 없음.
  - `answers.length === 2`인 경우 부족분을 `❌`로 채워 이모지 총 **3개** 유지, `"1/3"` 표기, throw 0건, `console.warn("[FQD] E_SCHEMA_INVALID share")` **1건**만 출력.
  - 반환 문자열에 `userKey`, `@`(이메일), `\d{2,3}-\d{3,4}-\d{4}`(전화) 패턴 미포함(정규식 테스트).
- **Covers**: [F8-AC-1, F8-AC-5, F8-AC-7, F8-AC-8, F8-AC-9]
- **Files**: `src/lib/share.ts`
- **Depends on**: Task 1.1, Task 2.5

### Task 2.9 `useErrorToast` 훅 (중복 억제)
- **Description**: `AppError`를 받아 TDS `Toast`로 표시하되 동일 `code`는 쿨다운으로 억제하는 훅.
- **DoD**:
  - 동일 `code`가 1000ms 내 5회 요청되면 Toast 표시 **1회**, `logAppError` 호출 **5건**.
  - 다른 `code`는 즉시 표시(억제 없음).
  - Toast 문구는 `ERROR_CATALOG[code].userMessage`만 사용, 서버 `message`를 인자로 받아도 DOM에 렌더하지 않음.
  - 언마운트 후 타이머 콜백이 setState를 호출하지 않음(경고 0건).
- **Covers**: [F9-AC-7, F9-AC-8]
- **Files**: `src/hooks/useErrorToast.ts`
- **Depends on**: Task 2.3

### Task 2.10 일일 3문항 결정론적 선택기 **[신규]**
- **Description**: `pickDailyQuestions(dateKey, bank, recentIds)` — `dateKey` 시드 해시로 3문항을 결정론적으로 선택. 순수 함수(스토리지 접근 0건).
- **DoD**:
  - 동일 `dateKey`로 **100회 호출 시 반환 id 배열이 완전히 동일**(순서 포함).
  - 반환 길이 **정확히 3**, id 중복 0건.
  - `recentIds`(최근 14일 출제분)에 포함된 문항을 우선 배제; 배제 후 후보가 3 미만이면 배제를 무시하고 3개를 채우며 **throw 0건**, `console.warn`/`console.error` 0건.
  - 서로 다른 `dateKey` 30개에 대해 반환 조합이 최소 25종 이상(쏠림 방지 테스트).
  - `bank`가 빈 배열이면 `[]` 반환(크래시 0).
- **Covers**: [F1(출제 규칙)]
- **Files**: `src/lib/dailyPicker.ts`
- **Depends on**: Task 1.1, Task 1.3, Task 2.5

### Task 2.11 데일리 세션 스토어 **[신규]**
- **Description**: `getOrCreateTodaySession(dateKey)`, `saveAnswer(dateKey, index, choice)`, `finalizeSession(dateKey)` — 세션 생성/재개/완료의 단일 소스.
- **DoD**:
  - 같은 `dateKey`로 `getOrCreateTodaySession`을 5회 호출해도 `fqd:v1:sessions` 내 해당 `dateKey` 세션은 **정확히 1건**(중복 생성 0).
  - 신규 세션 초기값: `answers: []`, `score: 0`, `status: "in_progress"`.
  - `saveAnswer(dateKey, 1, 2)` 후 `answers[1] === 2`; 같은 index 재저장 시 배열 길이 불변(덮어쓰기), `console.error` 0건.
  - `finalizeSession`이 이미 `status: "completed"`인 세션에 호출되면 `{ duplicated: true }` 반환, `score`·`answers` **불변**, `console.warn("[FQD] E_CONFLICT_STATE daily")` **1건**, `console.error` 0건.
  - `fqd:v1:sessions`가 배열이 아닐 때 해당 키만 `"[]"`로 복구하고 `fqd:v1:notes`·`fqd:v1:profile`은 잔존(테스트로 확인).
  - 모든 반환은 `Result<T>` 또는 순수 객체이며 `throw` 0건.
- **Covers**: [F1(세션 진행/재개), F6-AC-12(키 격리 재확인)]
- **Files**: `src/lib/dailyStore.ts`
- **Depends on**: Task 2.1, Task 2.2, Task 2.5

### Task 2.12 스트릭 계산 + 점수 규칙 + 뱃지 해금 **[신규]**
- **Description**: `computeStreak(profile, dateKey)`, `scoreSession(session, questions)`, `unlockBadges(profile, ctx)` 순수 함수. 점수 상수는 `SCORE_RULES` **단일 소스**로 격리(§6 확정 시 이 파일만 수정).
- **DoD**:
  - `computeStreak`: `lastCompletedDateKey`와의 `diffDays === 1` → `streak + 1`; `=== 0` → `streak` 불변(재완료); `>= 2` 또는 `null` → `1`로 리셋. 세 케이스 모두 단위 테스트 존재.
  - `scoreSession`: `answers`와 `questions[i].answerIndex` 비교로 정답 수를 세고 `SCORE_RULES` 공식으로 점수 산출. `answers.length < questions.length`인 경우 부족분을 오답 처리하고 **throw 0건**.
  - 일일 최대 점수 × 7 ≤ **553**(`clampScore` 상한)임을 검증하는 테스트가 존재하고 통과(불일치 시 실패로 §6 갭 노출).
  - `unlockBadges`가 이미 `profile.badges`에 있는 뱃지를 다시 반환하지 않음(중복 해금 0), 신규 해금분만 배열로 반환.
  - 스토리지·네트워크 접근 0건(순수 함수 테스트).
- **Covers**: [F2(스트릭/뱃지), F1(점수 산출)] — 세부 AC는 §6 확정 후 매핑
- **Files**: `src/lib/streak.ts`, `src/lib/scoreRules.ts`
- **Depends on**: Task 1.1, Task 2.5

### Task 2.13 오답 → 노트 자동 적재 **[신규]**
- **Description**: `appendNotesFromSession(session, questions)` — 완료 세션의 오답 문항만 노트에 적재. `notesStore.ts`에 추가(2.7 완료 후 편집).
- **DoD**:
  - 3문제 중 2오답 세션 → `fqd:v1:notes`에 **정확히 2건** 추가, 각 행 `status: "todo"`, `reviewedAt: null`, `createdAt`은 epoch ms 숫자.
  - 동일 `questionId`가 이미 노트에 있으면 **신규 행 추가 0건**이며 기존 행의 `status`/`reviewedAt`을 변경하지 않음(재오답 시 done→todo 되돌림 금지 — §6 Q3 확정 전 기본 동작).
  - **동일 세션으로 2회 호출해도** 노트 총 건수 불변(멱등성 테스트, StrictMode 이중 실행 대비).
  - 정답 문항은 노트에 적재되지 않음(0건 검증).
  - `throw` 0건, `console.error` 0건.
- **Covers**: [F6-AC-1~4(오답 자동 적재) — Part 1 AC 번호 확정 후 재매핑]
- **Files**: `src/lib/notesStore.ts`
- **Depends on**: Task 2.7, Task 2.11

### Task 2.14 심화 해설 해금 상태(리워드 광고 게이트) **[신규]**
- **Description**: `isDeepExplainUnlocked(dateKey)`, `unlockDeepExplain(dateKey)` — `Flags.deepExplainUnlockedDateKey` 기반 일 단위 해금 상태. **`TossRewardAd` 컴포넌트 자체는 수정하지 않는다.**
- **DoD**:
  - `unlockDeepExplain("2026-08-26")` 후 `isDeepExplainUnlocked("2026-08-26") === true`, `isDeepExplainUnlocked("2026-08-27") === false`.
  - 초기 상태(플래그 없음)에서 `isDeepExplainUnlocked` 호출 시 `false` 반환 + 크래시 0 + `console.warn` 0건.
  - `fqd:v1:flags`가 객체가 아닐 때 해당 키만 기본 플래그로 복구, 다른 키 잔존.
  - `src/components/TossRewardAd.tsx`에 대한 `git diff`가 **0 라인**(템플릿 미수정 검증).
  - 네트워크 호출 0건(광고 SDK 호출은 UI 패킷 3.8 담당).
- **Covers**: [F5(리워드 광고 → 심화 해설 게이트)]
- **Files**: `src/lib/deepExplain.ts`
- **Depends on**: Task 2.1, Task 2.5

---

## Epic 3. 코어 UI 페이지 (1 패킷 = 1 화면)

**Risk Assessment**
- **Complexity**: Medium-High
- **Risk factors**: (1) `location.state`/URL 파라미터를 `as`로만 캐스팅하면 새로고침·딥링크에서 즉시 크래시. (2) 노트 200건을 그대로 렌더하면 DOM 폭증으로 스크롤 AC 실패. (3) TDS 컴포넌트에 Tailwind/인라인 여백을 덮어쓰면 검수 반려. (4) 랭킹 화면이 로딩·캐시·에러·로컬 4상태를 한 컴포넌트에 섞으면 10분 패킷 초과. (5) **신규**: 퀴즈 진행 화면이 새로고침 복구를 다루지 않으면 답안이 날아가 완주율이 무너짐.
- **Mitigation**: 데이터/에러 판단은 Epic 2에서 끝내고 페이지는 **상태 → 렌더 매핑만** 담당. state 수신 화면마다 "state 없이 직접 진입해도 크래시 없음" AC를 별도로 둔다. 랭킹 화면은 3.3/3.4로, 데일리 플로우는 3.6/3.7/3.8로 분할.

### Task 3.1 `/notes` 목록 화면 **[수정]**
- **Description**: 오답 노트 목록. 진입 시 `sanitizeNotes` 실행 → 정제 결과 렌더, 윈도잉 리스트 적용.
- **DoD**:
  - 고아 참조 1건 이상 제거 시 Toast `"복구할 수 없는 기록 1건을 정리했어요"`가 **1회**만 표시(N건 제거해도 Toast 1개), 나머지 행 정상 렌더, `console.error` 0건.
  - 노트 200건 상태에서 스크롤 시 DOM 내 `ListRow` 개수 **40 이하** 유지(윈도우 30행 + 버퍼).
  - `fqd:v1:notes`가 객체 문자열일 때 크래시 없이 빈 상태 렌더 + `console.warn` 1건, `sessions`/`profile` 키 잔존.
  - **[신규 DoD — F6-AC-5 빈 상태]** 노트 0건일 때 `Asset.ContentIcon` + `"아직 오답이 없어요"` + `"퀴즈 풀러 가기"` 버튼 렌더, `ListRow` **0개**, `console.warn`/`console.error` 0건. 버튼 탭 시 `navigate('/daily')` 호출.
  - **[신규 DoD]** 각 행에 `status`별 TDS `Chip`(`"복습 전"` / `"복습완료"`)이 표시되고, 탭 시 `navigate('/notes/' + questionId)` 호출.
  - 각 행은 TDS `ListRow`만 사용하고 `style`/`className`으로 padding·margin 지정 0건. 간격은 `Spacing`(size 필수)만 사용.
  - `/notes`로 state 없이 직접 진입해도 크래시 없이 목록 또는 빈 상태 렌더.
- **Covers**: [F6-AC-5, F6-AC-6, F6-AC-7, F6-AC-12]
- **Files**: `src/pages/NotesPage.tsx`
- **Depends on**: Task 2.7, Task 2.9

### Task 3.2 `/notes/:questionId` 복습 화면
- **Description**: 단일 문항 복습. URL 파라미터 검증 → 조회 → 선택지 렌더 → 채점.
- **DoD**:
  - `useParams()` 값이 `/^q-\d{3}$/`에 불일치(`Q-7`, `<script>alert(1)</script>`)하면 **조회 시도 없이** 빈 상태 렌더, 파라미터 문자열이 DOM 어디에도 출력되지 않음, `console.warn` **1건**(`E_VALIDATION`/400/`questionId`).
  - 형식은 맞지만 은행·노트에 없는 `q-999` → `Asset.ContentIcon` + `"문제를 찾을 수 없어요"` + `"목록으로"` 버튼 렌더, 선택지 `Button` **0개**, `console.error` 0건. `"목록으로"` 탭 시 `navigate('/notes', { replace: true })` 호출.
  - 이미 `done`인 노트에서 정답 재선택 시 `data-testid="review-result-chip"`에 `"복습완료"` 표시, `AlertDialog` 미표시, `reviewedAt` 불변.
  - 20번째 신규 복습 완료 시 `AlertDialog "오답 20개 정복!"`이 **1회** 표시되고 닫은 뒤 재표시되지 않음.
  - `location.state` 미사용 또는 사용 시 `?? null` 가드 후 사용(직접 진입 크래시 0).
- **Covers**: [F6-AC-8, F6-AC-9, F6-AC-10, F6-AC-11]
- **Files**: `src/pages/NoteReviewPage.tsx`
- **Depends on**: Task 2.7, Task 2.9

### Task 3.3 `/rank` 정상 · 로딩 · 빈 상태
- **Description**: 리더보드 조회 후 정상 렌더, 스켈레톤, 404/빈 결과 처리, 주차 전환 시 캐시 무시.
- **DoD**:
  - `entries` 50건 수신 시 `data-testid="rank-row"` **50개** 렌더, 1~3위 행에 순위 `Chip` 표시.
  - 내 순위가 51위 이하일 때 `data-testid="rank-me-sticky"` 카드가 리스트 상단 고정 렌더.
  - 응답 대기 중 `data-testid="rank-skeleton"` **8개** 렌더, 데이터 수신 시 0개로 교체(무한 스켈레톤 없음).
  - `RankCache.weekKey`가 현재 주차와 다르면 캐시를 렌더하지 않고 현재 `weekKey`로 재조회; 실패 시 `"이번 주 랭킹이 아직 없어요"` 빈 상태.
  - 404 `WEEK_NOT_FOUND` → `rank-row` **0개**, `Asset.ContentIcon` + `"이번 주 랭킹이 아직 없어요"`, `"다시 시도"` 버튼 **미렌더**, `data-testid="rank-hero"`에 로컬 주간 점수 표시.
  - 유효 항목 0개(스키마 필터 결과 포함)일 때도 동일 빈 상태.
  - state 없이 직접 진입/새로고침해도 크래시 없음.
- **Covers**: [F7-AC-2, F7-AC-3, F7-AC-6, F7-AC-13, F7-AC-20(렌더 측)]
- **Files**: `src/pages/RankPage.tsx`, `src/pages/rank/RankList.tsx`
- **Depends on**: Task 2.6

### Task 3.4 `/rank` 폴백 배너 · 옵트인 시트
- **Description**: 3.3에 에러/폴백 상태 레이어 추가. 배너 문구 매핑, `"다시 시도"` 버튼 상태, 옵트인 BottomSheet.
- **DoD**:
  - 500 2회 실패 + 캐시 있음 → 캐시 렌더 + `stale` 표시 + 배너 `"랭킹을 불러오지 못해 마지막 순위를 보여드려요"`. 캐시 없음 → `Asset.ContentIcon` + `"랭킹을 불러올 수 없어요"` + `"다시 시도"` 버튼, `console.error` 0건.
  - 배너 문구 매핑: 408 → `"네트워크가 불안정해요. 잠시 후 다시 시도해주세요"`, 0 → `"인터넷 연결을 확인해주세요"`, 503 → `"랭킹 서버 점검 중이에요"`, 401 → `"로그인 정보를 확인할 수 없어 랭킹은 이 기기에만 저장돼요"`, 403 → `"다른 사용자의 기록에는 접근할 수 없어요"`.
  - 429 재시도 대기 중 `"다시 시도"` 버튼 `disabled` 유지, 대기 종료 후 활성화. 재시도도 429면 Toast `"요청이 많아요. 잠시 후 다시 시도해주세요"` **1회**.
  - 503/403/401 상태에서 화면 유지 중 추가 자동 호출 **0회**(버튼 탭 시에만 재요청).
  - `rankOptIn === false` → `POST /v1/scores`·`GET /v1/leaderboard` 각 **0회**, `rank-hero`에 로컬 주간 점수만, `"랭킹 참여하기"` 버튼 → TDS `Switch` 포함 `BottomSheet` 표시. Switch ON 시에만 재시도 트리거.
  - `VITE_LEADERBOARD_API_BASE` 미설정 → 네트워크 0회, `"이번 주 랭킹이 아직 없어요"` 안내(점검 배너 아님), `console.warn`/`console.error` 0건.
- **Covers**: [F7-AC-4, F7-AC-5, F7-AC-9(Toast), F7-AC-11, F7-AC-12, F7-AC-16~19, F7-AC-22]
- **Files**: `src/pages/RankPage.tsx`, `src/pages/rank/RankBanner.tsx`, `src/pages/rank/RankOptInSheet.tsx`
- **Depends on**: Task 3.3, Task 2.9

### Task 3.5 `/share` 공유 화면
- **Description**: 공유 카드 미리보기 + 클립보드 복사 + 미완료/잘못된 state 방어.
- **DoD**:
  - `const state = (useLocation().state as RouteState["/share"]) ?? null;` 패턴 사용. `state`가 없거나 `dateKey`가 문자열이 아니면(숫자 `20260826`) **오늘 `dateKey`로 폴백**해 렌더, `console.warn` **1건**, 크래시 0.
  - 완료 세션 존재 시 `data-testid="share-preview"` 텍스트가 `buildShareText` 반환값과 정확히 동일.
  - `"복사하기"` 탭 → `navigator.clipboard.writeText`가 미리보기와 **동일 문자열**로 1회 호출, Toast `"복사했어요! 친구에게 붙여넣어 보세요"`, `Flags.lastShareAt`에 현재 epoch ms 저장.
  - `navigator.clipboard === undefined` 또는 reject → Toast `"복사에 실패했어요. 아래 텍스트를 길게 눌러 복사해주세요"`, 텍스트가 `readOnly` TDS `TextField`(multiline)로 노출, `lastShareAt` 미갱신, `console.error` 0건.
  - 오늘 세션 없음/`status !== "completed"` → `"오늘의 퀴즈를 먼저 완료해주세요"` 빈 상태 + `"퀴즈 풀러 가기"` 버튼, `"복사하기"` 버튼 **미렌더**.
  - 파일 내 `window.open`, `window.location.href`, `<a href="http` 사용 **0건**.
- **Covers**: [F8-AC-2, F8-AC-3, F8-AC-4, F8-AC-6, F8-AC-10]
- **Files**: `src/pages/SharePage.tsx`
- **Depends on**: Task 2.8, Task 2.9

### Task 3.6 `/` 홈 화면 **[신규]**
- **Description**: 오늘 상태(미시작/진행중/완료) 분기 + 스트릭·주간 점수 요약 + CTA. 데이터 판단은 전부 Epic 2 함수 호출로 위임.
- **DoD**:
  - 오늘 세션 없음 → `data-testid="home-cta"` 라벨이 `"오늘의 퀴즈 풀기"`, 탭 시 `navigate('/daily')`.
  - `status: "in_progress"` && `answers.length === 1` → CTA 라벨 `"이어서 풀기"`, `data-testid="home-progress"` 텍스트가 `"1/3"`.
  - `status: "completed"` → CTA 라벨 `"결과 보기"`(→ `/daily/result`)이고 `"공유하기"` 버튼이 추가 렌더(→ `navigate('/share', { state: { dateKey } })`).
  - `data-testid="home-streak"`에 `computeStreak` 결과가 `"4일 연속 🔥"` 형식으로 표시되고, streak가 0이면 해당 요소 **미렌더**.
  - `data-testid="home-week-score"`에 `sumWeeklyScore` 결과(로컬 계산)가 표시되며 네트워크 호출 **0회**.
  - `FloatingTabBar`가 렌더되고, TDS 컴포넌트에 `style`/`className` padding·margin 지정 **0건**(간격은 `Spacing`만).
  - `fqd:v1:sessions`/`profile`이 손상된 상태로 진입해도 크래시 0, 미시작 상태로 렌더 + `console.warn` 1건.
- **Covers**: [F1(진입/재개 CTA), F2(스트릭 노출), F7-AC-5(로컬 점수 표시 보조)]
- **Files**: `src/pages/HomePage.tsx`
- **Depends on**: Task 2.11, Task 2.12, Task 2.9

### Task 3.7 `/daily` 퀴즈 진행 화면 **[신규]**
- **Description**: 3문항 순차 진행. 선택 → 즉시 채점 → 기본 해설 → 다음. 새로고침 복구 포함.
- **DoD**:
  - 현재 문항에 선택지 `Button` **정확히 4개** 렌더, 진행도 `data-testid="daily-progress"`가 `"1/3"`→`"2/3"`→`"3/3"`로 갱신.
  - 선택 즉시 `data-testid="answer-chip"`에 `"정답"`/`"오답"` 표시 + `Paragraph.Text`로 `question.explanation` 렌더, 선택지 `Button` 전부 `disabled`(재선택 0회 — `saveAnswer` 추가 호출 0건).
  - 3번째 문항 채점 후 `"결과 보기"` 탭 시 `navigate('/daily/result', { replace: true, state: { dateKey } })` 호출.
  - **새로고침 복구**: `answers.length === 2` 상태로 재진입 시 3번째 문항부터 렌더되고 `fqd:v1:sessions`의 `answers` 길이 불변(중복 저장 0건).
  - 이미 `status: "completed"`인 날 진입 시 즉시 `navigate('/daily/result', { replace: true })` 호출, 선택지 `Button` 0개 렌더.
  - state 없이 직접 진입/딥링크에서 크래시 0, `console.error` 0건.
  - 심화 해설(`deepExplanation`)은 이 화면에 **렌더되지 않음**(DOM 검색 0건 — 게이트는 3.8 담당).
- **Covers**: [F1(3문제 진행/채점/해설)]
- **Files**: `src/pages/DailyPage.tsx`
- **Depends on**: Task 2.10, Task 2.11, Task 2.9

### Task 3.8 `/daily/result` 결과 + 리워드 광고 심화 해설 **[신규]**
- **Description**: 결과 요약(점수·이모지·스트릭·뱃지) + `TossRewardAd` 게이트 뒤 심화 해설 + 공유/오답노트 진입.
- **DoD**:
  - `const state = (useLocation().state as RouteState["/daily/result"]) ?? null;` 패턴 사용. state 없으면 **오늘 `dateKey`로 폴백**, `console.warn` 1건, 크래시 0.
  - 해당 `dateKey` 세션이 없거나 `status !== "completed"` → `navigate('/daily', { replace: true })` 호출, 결과 요소 0개 렌더.
  - `data-testid="result-summary"`에 `"⭕️❌⭕️  2/3"` 형식과 점수가 표시되고, 신규 해금 뱃지가 있으면 `AlertDialog`가 **1회**만 표시(닫은 뒤 재진입 시 미표시).
  - **초기 렌더 시 `data-testid="deep-explain"` 요소 0개**이며 DOM 어디에도 `deepExplanation` 문자열이 포함되지 않음.
  - 심화 해설은 `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>` 의 children으로만 렌더되고, `slotId` 하드코딩 **0건**(grep 검증).
  - 광고 시청 완료 콜백 → `unlockDeepExplain(dateKey)` 호출 후 `data-testid="deep-explain"`가 문항 수만큼 렌더. **같은 날 재진입 시 광고 노출 0회로 즉시 표시**, 다음 날 `dateKey`에서는 다시 게이트됨.
  - `"공유하기"` 탭 → `navigate('/share', { state: { dateKey } })`(타입은 `RouteState["/share"]` 준수), `"오답노트 보기"` 탭 → `navigate('/notes')`.
  - `src/components/TossRewardAd.tsx` 수정 0 라인, `console.error` 0건.
- **Covers**: [F5(리워드 광고 → 심화 해설), F2(뱃지 노출), F8-AC-2 진입 경로]
- **Files**: `src/pages/DailyResultPage.tsx`
- **Depends on**: Task 2.12, Task 2.14, Task 2.9

---

## Epic 4. 통합 + 폴리시 (ErrorBoundary · 라우팅 · 광고 배치 · 트리거 배선)

**Risk Assessment**
- **Complexity**: Medium
- **Risk factors**: (1) ErrorBoundary가 없으면 단일 라우트 예외가 화이트스크린으로 이어짐. (2) `AdSlot` 배너가 `FloatingTabBar`에 가려지면 UI 검수 반려. (3) 데일리 완료 부작용(점수·스트릭·노트·제출)을 페이지에 흩뿌리면 중복 적재·중복 제출(409) 발생. (4) 라우트 등록 누락 시 딥링크 404 — **이번 개정에서 `/`, `/daily`, `/daily/result` 3개가 실제로 누락돼 있었음**.
- **Mitigation**: 페이지가 모두 독립 동작하는 상태(Epic 3 완료)에서 마지막에 전역 래핑·라우트 등록·트리거 1곳 배선만 수행해 회귀 범위를 좁힌다. 완료 부작용은 `completeDaily.ts` 단일 함수에 모으고 가드 플래그로 멱등화한다.

### Task 4.1 전역 ErrorBoundary + unhandledrejection **[수정]**
- **Description**: 라우트 트리를 감싸는 `AppErrorBoundary`와 `window.onunhandledrejection` 핸들러 등록.
- **DoD**:
  - 라우트 컴포넌트가 `throw new Error("boom")` 시 `data-testid="app-error-boundary"`에 `"화면을 표시하지 못했어요"` + `"홈으로 돌아가기"` 버튼 렌더.
  - 버튼 탭 → `navigate('/', { replace: true })` 호출 후 경계 상태 리셋되어 정상 화면 복구.
  - 해당 경로에서 `console.error` **0건**, `console.warn` **1건**(`[FQD] E_SERVER 500 boundary` 포맷).
  - `Promise.reject(new Error("x"))` 발생 시 화면 유지, `console.warn("[FQD] E_SERVER 500 unhandled")` 1건, `console.error` 0건, 화이트스크린 없음.
  - 핸들러는 마운트 시 등록, 언마운트 시 `removeEventListener`로 해제(중복 등록 0).
- **Covers**: [F9-AC-5, F9-AC-6]
- **Files**: `src/components/AppErrorBoundary.tsx`, `src/App.tsx`, `src/main.tsx`
- **Depends on**: Task 2.3, **Task 3.1, 3.2, 3.4, 3.5, 3.6, 3.7, 3.8** (3.3은 3.4에 포함)

### Task 4.2 라우팅 등록(8개) + `/rank` 배너 배치 **[수정]**
- **Description**: `react-router-dom` 라우트 등록과 `/rank` 하단 `AdSlot` 배치.
- **등록 라우트**: `/`, `/daily`, `/daily/result`, `/notes`, `/notes/:questionId`, `/rank`, `/share`, `*`
- **DoD**:
  - **8개 라우트 전부** 새로고침 직접 진입에서 크래시 0(라우트별 스모크 테스트 8건), `*`는 `"화면을 찾을 수 없어요"` + 홈 버튼.
  - `FloatingTabBar`는 `/`, `/notes`, `/rank`에서만 렌더되고 `/daily`, `/daily/result`, `/share`, `*`에서는 렌더 0건.
  - `AdSlot`이 마지막 `rank-row` **아래**에 렌더되고, 배너 요소의 `getBoundingClientRect().bottom` < `FloatingTabBar`의 `top`(하단 여백은 flex 레이아웃 CSS로만 처리, TDS 컴포넌트 여백 오버라이드 **0건**).
  - `adGroupId`는 `import.meta.env.VITE_TOSS_AD_GROUP_ID`에서 주입(하드코딩 0건, grep 검증).
  - 빈 상태(`rank-row` 0개)에서도 배너가 탭바를 가리지 않음.
- **Covers**: [F7-AC-8, 전 라우트 딥링크 안정성]
- **Files**: `src/App.tsx`, `src/routes.tsx`, `src/pages/RankPage.tsx`
- **Depends on**: Task 4.1

### Task 4.3 데일리 완료 부작용 단일 배선 + 외부 이탈 정적 검사 **[수정]**
- **Description**: `completeDaily(dateKey)` **한 함수**에서만 `finalizeSession` → `scoreSession` → `computeStreak`/`unlockBadges` → `appendNotesFromSession` → `submitScore`를 순서대로 수행. 공유 경로의 외부 이동 금지를 정적 검증.
- **DoD**:
  - 데일리 완료 1회당 `POST /v1/scores` 호출 **정확히 1회**(StrictMode 이중 렌더에서도 1회 — 제출 가드 플래그 확인).
  - 데일리 완료 1회당 노트 적재 **1회**(동일 세션 재호출 시 노트 총 건수 불변), 스트릭 증가 **1회**(2 증가 0건).
  - 전송 바디가 `{ userKey, nickname, weekKey, score, streak }`이고 `score`는 `clampScore` 통과값, `weekKey`는 `getWeekKey(now)` 결과와 일치.
  - `rankOptIn === false` 또는 API base 미설정이면 네트워크 호출 0회이며 **로컬 부작용(점수·스트릭·노트)은 정상 수행**되고 완료 플로우가 성공 종료.
  - `submitScore` 실패(500/오프라인) 시에도 로컬 부작용은 롤백되지 않고 결과 화면 진입이 막히지 않음.
  - `src/pages/SharePage.tsx`, `src/pages/DailyResultPage.tsx`, `src/lib/share.ts` grep에서 `window.open`/`window.location.href`/`<a href="http` 매치 **0건**(`scripts/check-no-external-nav.mjs`로 검증, 위반 시 exit code 1).
  - 전체 `npm run build` 통과, 콘솔 에러 0건.
- **Covers**: [F7-AC-1, F8-AC-3, F1(완료 처리), F2(스트릭/뱃지 확정), F6(오답 적재 트리거)]
- **Files**: `src/features/daily/completeDaily.ts`, `src/pages/DailyPage.tsx`, `scripts/check-no-external-nav.mjs`
- **Depends on**: Task 2.6, Task 2.11, Task 2.12, Task 2.13, Task 3.7, Task 4.2

### Task 4.4 TDS 검수 가드 스크립트 + 최종 빌드 게이트 **[신규]**
- **Description**: 검수 반려 요인을 CI에서 차단하는 정적 검사 스크립트 + 최종 통합 확인.
- **DoD**:
  - `scripts/check-tds.mjs`가 `src/**/*.tsx`를 스캔해 다음 위반 시 exit code 1: (a) TDS 컴포넌트(`ListRow`, `Button`, `TextField`, `Chip`, `Switch`, `Top`, `Tab`) JSX에 `className`/`style`로 `padding`·`margin` 계열 지정, (b) `@mui/`·`antd`·`@chakra-ui/`·`@/components/ui/`(shadcn) import, (c) `<Spacing>`에 `size` prop 누락.
  - 현재 코드베이스에서 위 스크립트 실행 시 위반 **0건**으로 통과.
  - `scripts/check-env.mjs`: `VITE_TOSS_AD_GROUP_ID`, `VITE_TOSS_AD_SLOT_ID`, `VITE_LEADERBOARD_API_BASE` 3개 키가 `.env.example`에 존재하고 소스 내 하드코딩된 광고/슬롯 ID 문자열 매치 0건.
  - `npm run verify`(= `tsc --noEmit && check-tds && check-no-external-nav && check-env && vitest run && vite build`)가 **전부 통과**, 종료 코드 0.
  - 8개 라우트 스모크 테스트 전부 통과, 전 테스트 로그에 `console.error` 0건.
- **Covers**: [검수 게이트 — 전 AC 공통 회귀 방지]
- **Files**: `scripts/check-tds.mjs`, `scripts/check-env.mjs`, `package.json`, `.env.example`
- **Depends on**: Task 4.3

---

## 4. 실행 순서 DAG (레이어 검증)

```
[타입/데이터]   1.1 ─┬─ 1.2 ─┬─ 2.2
                     │        └─ 2.3 ─┬─ 2.4
                     ├─ 1.3            └─ 2.9
                     ├─ 2.1
                     └─ 2.5 ─┬─ 2.10 (+1.3)
                             ├─ 2.12
                             └─ 2.14 (+2.1)
[데이터/도메인] 2.1+2.2 ─┬─ 2.7 ─── 2.13 (+2.11)
                          └─ 2.11
[API]           2.4+2.5+2.1+2.2 ── 2.6
[공유 로직]     1.1+2.5 ── 2.8
[UI]            2.7,2.9 ─ 3.1 / 3.2
                2.6 ───── 3.3 ── 3.4
                2.8,2.9 ─ 3.5
                2.11,2.12,2.9 ─ 3.6
                2.10,2.11,2.9 ─ 3.7
                2.12,2.14,2.9 ─ 3.8
[통합]          3.1,3.2,3.4,3.5,3.6,3.7,3.8 ── 4.1 ── 4.2 ── 4.3 ── 4.4
```

- **레이어 순서 준수**: 타입 → 스토리지/스키마 → 에러/네트워크 → 도메인 → API 클라이언트 → UI → 통합 → 검증 게이트. **역방향 의존성 0건**, **순환 의존성 0건**(위 DAG는 위상 정렬 가능).
- **병렬 가능 구간**: (1.2, 1.3, 2.1, 2.5) / (2.7, 2.11, 2.8) / (3.1, 3.2, 3.5, 3.6, 3.7, 3.8) — 단, 파일 충돌 표(§5) 준수 필요.

---

## 5. File Conflict Map (동일 파일 다중 수정)

| 파일 | 수정 태스크 | 충돌 해소 |
|---|---|---|
| `src/lib/types.ts` | 1.1만 | 충돌 없음 (1.3은 `src/data/questionBank.ts` 분리) |
| `src/lib/notesStore.ts` | 2.7 → **2.13** | 2.13이 `Depends on: 2.7`로 순차 강제. 2.13은 신규 export 추가만, 2.7 함수 시그니처 변경 금지 |
| `src/pages/RankPage.tsx` | 3.3 → 3.4 → 4.2 | 3.4는 `Depends on: 3.3`, 4.2는 `Depends on: 4.1(→3.x)`. 4.2는 `AdSlot` JSX 1줄 추가만 |
| `src/App.tsx` | 4.1 → 4.2 | 4.2가 `Depends on: 4.1`로 순차 강제. 4.1은 Boundary 래핑, 4.2는 라우트 트리 |
| `src/pages/SharePage.tsx` | 3.5 → 4.3 | 4.3은 grep 검증만 수행(코드 수정 없음이 기본), 위반 발견 시에만 수정 |
| `src/pages/DailyPage.tsx` | 3.7 → 4.3 | 4.3이 완료 지점 호출을 `completeDaily`로 교체(1곳). 3.7은 호출부를 TODO 주석 1줄로 남겨 4.3이 치환 |
| 그 외 23개 파일 | 단일 태스크 | 충돌 없음 |

**병렬 실행 금지 쌍**: (2.7, 2.13), (3.3, 3.4), (3.4, 4.2), (4.1, 4.2), (3.7, 4.3), (3.5, 4.3).

---

## 6. Open Questions — SPEC Part 1 확정 필요 (임의 확정하지 않음)

아래 항목은 **PRD에는 있으나 제공된 SPEC Part 2에 근거가 없어** 값을 확정하지 않았다. 각 항목은 상수 1곳(`SCORE_RULES` 등)에 격리해 두었으므로, 확정 시 **해당 파일 1개만 수정**하면 되고 다른 패킷은 영향받지 않는다.

| # | 미확정 사항 | 임시 처리 | 확정 시 수정 대상 |
|---|---|---|---|
| Q1 | **일일 점수 공식** — SPEC Part 2 예시 `"오늘 38점"`(2/3 정답)과 `clampScore` 상한 **553**의 관계 불명. 553 = 7 × 79 인데 79점의 근거 없음 | `SCORE_RULES` 상수로 격리 + "일일 최대 × 7 ≤ 553" 검증 테스트를 두어 불일치 시 **테스트 실패로 노출** | Task 2.12 / `src/lib/scoreRules.ts` |
| Q2 | **스트릭 뱃지 목록** — `note_master`만 SPEC에 확인됨. PRD의 "정답률 기반 스트릭/뱃지"에 해당하는 뱃지 id·조건 미확정 | `Badge` 유니온과 `unlockBadges` 규칙 테이블로 격리(현재 `note_master` 1종) | Task 1.1(유니온) / Task 2.12(규칙) |
| Q3 | **이미 복습완료(`done`)한 문항을 데일리에서 재오답** 했을 때 노트 상태 | 기본값: **`done` 유지, 신규 행 추가 0건**(Task 2.13 DoD에 명시) | Task 2.13 |
| Q4 | **F6-AC-1~5 정확한 AC 번호/문구** — Part 1 미제공 | Task 2.13, 3.1의 DoD는 PRD 서술 기준으로 작성, AC 매핑은 `F6-AC-1~4(잠정)` 표기 | §7 커버리지 표 하단 |
| Q5 | **문항 은행 규모/카테고리** — 최소 30문항은 중복 회피(최근 14일 = 42문항 소요) 기준 추정치 | Task 1.3에서 30문항 이상으로 두되, 2.10이 후보 부족 시 배제 무시로 폴백해 크래시 0 보장 | Task 1.3 |

> Part 1 SPEC을 주시면 위 5건을 확정하고 §7 표의 잠정 매핑을 실제 AC 번호로 교체한다. **패킷 구조 변경은 불필요**하며 DoD 값만 갱신된다.

---

## 7. AC Coverage

### 7‑1. SPEC Part 2 (확정 커버리지)

- **Total ACs in SPEC (Part 2)**: **48** — F6: 7(AC‑6~12) / F7: 22(AC‑1~22) / F8: 10(AC‑1~10) / F9: 9(AC‑1~9)
- **Covered by tasks**: **48** / **Uncovered: 0**

| AC | Task |
|---|---|
| F6-AC-6 | 2.7, 3.1 |
| F6-AC-7 | 3.1 |
| F6-AC-8 | 2.7, 3.2 |
| F6-AC-9 | 3.2 |
| F6-AC-10 | 3.2 |
| F6-AC-11 | 2.7, 3.2 |
| F6-AC-12 | 2.1, 2.11, 3.1 |
| F7-AC-1 | 2.6, 4.3 |
| F7-AC-2 | 3.3 |
| F7-AC-3 | 3.3 |
| F7-AC-4 | 2.6, 3.4 |
| F7-AC-5 | 3.4, 3.6 |
| F7-AC-6 | 2.5, 3.3 |
| F7-AC-7 | 2.5 |
| F7-AC-8 | 4.2 |
| F7-AC-9 | 2.6, 3.4 |
| F7-AC-10 | 2.6 |
| F7-AC-11 | 2.6, 3.4 |
| F7-AC-12 | 2.6, 3.4 |
| F7-AC-13 | 3.3 |
| F7-AC-14 | 2.6 |
| F7-AC-15 | 2.6 |
| F7-AC-16 | 2.4, 3.4 |
| F7-AC-17 | 2.4, 3.4 |
| F7-AC-18 | 2.6, 3.4 |
| F7-AC-19 | 2.4, 3.4 |
| F7-AC-20 | 2.2, 2.6, 3.3 |
| F7-AC-21 | 2.5, 2.6 |
| F7-AC-22 | 2.6, 3.4 |
| F8-AC-1 | 2.8 |
| F8-AC-2 | 3.5, 3.8(진입) |
| F8-AC-3 | 3.5, 4.3 |
| F8-AC-4 | 3.5 |
| F8-AC-5 | 2.8 |
| F8-AC-6 | 3.5 |
| F8-AC-7 | 2.8 |
| F8-AC-8 | 2.8 |
| F8-AC-9 | 2.8 |
| F8-AC-10 | 3.5 |
| F9-AC-1 | 1.2, 2.3 |
| F9-AC-2 | 2.4 |
| F9-AC-3 | 2.4 |
| F9-AC-4 | 2.2 |
| F9-AC-5 | 4.1 |
| F9-AC-6 | 4.1 |
| F9-AC-7 | 2.9 |
| F9-AC-8 | 2.3, 2.9 |
| F9-AC-9 | 2.3 |

### 7‑2. PRD 6대 기능 → Task (Part 1 잠정 매핑)

| PRD 기능 | 상태 | Task |
|---|---|---|
| 매일 3문제 금융 퀴즈 (F1~F4 추정) | ✅ 커버 (AC 번호 확정 대기 — Q4) | 1.3, 2.10, 2.11, 2.12, 3.6, 3.7, 4.2, 4.3 |
| 정답률 기반 스트릭/뱃지 (F2 추정) | ⚠️ 커버, **뱃지 목록 확정 대기 — Q1/Q2** | 2.12, 3.6, 3.8, 4.3 |
| 오답노트 자동 정리 (F6) | ✅ 완전 커버 (AC‑6~12 확정 + AC‑1~5 잠정) | 2.7, 2.13, 3.1, 3.2 |
| 주간 랭킹 리더보드 (F7) | ✅ 완전 커버 (AC‑1~22) | 2.5, 2.6, 3.3, 3.4, 4.2, 4.3 |
| 친구와 점수 비교 공유 카드 (F8) | ✅ 완전 커버 (AC‑1~10) | 2.8, 3.5, 3.8, 4.3 |
| 리워드 광고 시청 시 심화 해설 (F5) | ✅ 커버 (AC 번호 확정 대기 — Q4) | 1.3(deepExplanation), 2.14, 3.8 |

**PRD 6/6 기능 모두 실행 패킷 보유. 커버리지 공백 0건.**