*(SPEC 이어서 — Part 2 / 3: F6 나머지 ~ F9)*

- **AC-6 [W][P1]**: Scenario: 삭제된 문항 참조 방어 (대응 상태코드 **404**)
  Given 노트에 문제 은행에 없는 `questionId: "q-999"`가 존재할 때
  When `/notes` 렌더
  Then 해당 행은 목록에서 제외되고 `fqd:v1:notes`에서 제거되며, `console.error` 없이 나머지 행이 정상 렌더됨
  And Toast `"복구할 수 없는 기록 1건을 정리했어요"`(`E_SCHEMA_INVALID`, 422)가 **1회**만 표시되고, N건 제거 시에도 Toast는 1개만 표시됨
- **AC-7 [S][P1]**: Scenario: 긴 목록 스크롤 성능
  While 노트가 200건인 상태
  When `/notes` 스크롤
  Then 리스트는 윈도잉(한 번에 최대 30행 DOM 유지)으로 렌더되어 DOM 내 `ListRow` 개수가 40 이하를 유지함
- **AC-8 [E][P2]**: Scenario: note_master 뱃지
  Given `status: "done"` 노트가 19개인 상태
  When 20번째 노트를 복습 완료
  Then `note_master` 뱃지가 해금되고 `AlertDialog` `"오답 20개 정복!"`이 1회 표시됨
- **AC-9 [W][P0]**: Scenario: 존재하지 않는 문항 복습 직접 진입 (대응 상태코드 **404**)
  Given 딥링크로 `/notes/q-999` 진입(노트에도 은행에도 없음)
  When 화면 렌더
  Then `Asset.ContentIcon` + `"문제를 찾을 수 없어요"`(`E_NOT_FOUND`, 404) + `"목록으로"` 버튼이 표시되고 선택지 `Button`은 0개 렌더됨
  And `"목록으로"` 탭 시 `navigate('/notes', { replace: true })`가 호출되고 `console.error` 0건
- **AC-10 [W][P0]**: Scenario: 잘못된 형식의 questionId 파라미터 (대응 상태코드 **400**)
  Given `/notes/<script>alert(1)</script>` 또는 `/notes/Q-7` 로 진입
  When 파라미터 검증(`/^q-\d{3}$/`) 실행
  Then 조회를 시도하지 않고 즉시 `"문제를 찾을 수 없어요"` 빈 상태를 렌더하며, 파라미터 문자열은 화면 어디에도 출력되지 않음(XSS 방어)
  And `AppError { code: "E_VALIDATION", httpStatus: 400, field: "questionId" }`가 `console.warn` 1건으로 기록됨
- **AC-11 [W][P1]**: Scenario: 이미 복습 완료한 노트 재복습 (대응 상태코드 **409**)
  Given `q-007` 노트가 `status: "done"` 인 상태
  When `/notes/q-007`에서 정답(index 2)을 다시 선택
  Then `reviewedAt`은 갱신되지 않고 `note_master` 카운트도 증가하지 않으며, `data-testid="review-result-chip"`에 `"복습완료"`가 표시됨
  And 뱃지 재해금 `AlertDialog`는 표시되지 않음(`E_CONFLICT_DUPLICATE`, 409 무음 처리)
- **AC-12 [W][P1]**: Scenario: 노트 배열 자체가 배열이 아님 (대응 상태코드 **400**)
  Given `fqd:v1:notes` 값이 `"{\"a\":1}"`(객체)일 때
  When `/notes` 진입
  Then 해당 키를 `"[]"`로 재초기화하고 빈 상태(AC-5)를 렌더하며 `console.warn` 1건만 출력함
  And `fqd:v1:sessions`·`fqd:v1:profile`은 삭제되지 않음

---

### F7. 주간 랭킹 리더보드 (외부 API + 오프라인 폴백)

- **Description**: 이번 주(월~일, KST) 누적 점수를 외부 랭킹 API에 제출하고 상위 50명 리더보드와 내 순위를 보여준다. 랭킹 참여는 옵트인이며, API 실패·오프라인 시 마지막 캐시 또는 로컬 전용 뷰로 폴백해 앱이 멈추지 않는다.
- **Data**: `Profile`, `RankCache`, `Flags.rankOptIn`, `Flags.rankDisabledReason`, `DailySession[]`(주간 합산)
- **API**: `POST /v1/scores`, `GET /v1/leaderboard` (상단 API Contract 참조)

**Requirements**
- **AC-1 [E][P0]**: Scenario: 주간 점수 제출
  Given `rankOptIn === true`, `weekKey = "2026-W35"`, 주간 합산 점수 `= 137`, `streak = 4` 일 때
  When 데일리 완료 처리가 끝남
  Then `POST /v1/scores`가 헤더 `X-User-Key: <profile.userKey>`와 바디 `{ userKey, nickname, weekKey: "2026-W35", score: 137, streak: 4 }`로 정확히 1회 호출됨
  And 200 응답 `{ rank: 12, total: 340 }` 수신 시 `RankCache.me.rank = 12`, `RankCache.stale = false`로 저장됨
- **AC-2 [E][P0]**: Scenario: 리더보드 조회 및 렌더
  Given `/rank` 진입 시 API가 `entries` 50건을 반환할 때
  When 응답 수신
  Then `data-testid="rank-row"` 요소가 50개 렌더되고 1~3위 행에 순위 `Chip`이 표시됨
  And 내 순위가 51위 이하일 경우 `data-testid="rank-me-sticky"` 카드가 리스트 상단에 고정 표시됨
- **AC-3 [S][P1]**: Scenario: 로딩 상태
  While `GET /v1/leaderboard` 응답 대기 중인 상태
  When 화면을 볼 때
  Then `data-testid="rank-skeleton"` 스켈레톤 행 8개가 표시되고 실제 데이터 수신 시 교체됨
- **AC-4 [W][P1]**: Scenario: 서버 오류 폴백 (**500 INTERNAL_ERROR**)
  Given `GET /v1/leaderboard`가 `500 { error: "INTERNAL_ERROR" }`를 반환할 때
  When 1회 재시도(총 2회 요청)도 500으로 실패
  Then `RankCache`가 있으면 캐시 데이터를 렌더하고 `RankCache.stale = true`로 표시하며 상단 배너 `"랭킹을 불러오지 못해 마지막 순위를 보여드려요"`(`E_SERVER`, 500)를 표시함
  And 캐시가 없으면 `Asset.ContentIcon` + `"랭킹을 불러올 수 없어요"` + `"다시 시도"` 버튼을 표시하고 `console.error`를 호출하지 않음
- **AC-5 [W][P1]**: Scenario: 옵트인 미동의
  Given `rankOptIn === false` 인 상태
  When 데일리 완료 및 `/rank` 진입
  Then `POST /v1/scores`·`GET /v1/leaderboard` 호출 횟수는 각각 **0회**이고, 화면에는 내 주간 점수만 로컬 계산해 보여주며 `"랭킹 참여하기"` 버튼(TDS `Switch` 포함 `BottomSheet`)이 표시됨
- **AC-6 [E][P1]**: Scenario: 주차 전환 초기화
  Given `RankCache.weekKey === "2026-W34"` 이고 현재 `weekKey === "2026-W35"` 일 때
  When `/rank` 진입
  Then 캐시를 렌더하지 않고 `weekKey=2026-W35`로 새로 조회하며, 조회 실패 시 `"이번 주 랭킹이 아직 없어요"` 빈 상태를 표시함
- **AC-7 [W][P0]**: Scenario: 점수 상한 초과 클램프 (대응 상태코드 **400**)
  Given 계산된 주간 점수가 `554` (상한 553 초과)일 때
  When 제출 시도
  Then 원본 값으로는 전송되지 않고 점수를 `553`으로 클램프해 전송하며, 클램프 발생 시 `console.warn("[FQD] E_LIMIT_EXCEEDED score")` 1건만 남김
  And 계산 결과가 음수(`-1`)이면 `0`으로 클램프해 전송함
- **AC-8 [U][P1]**: Scenario: 배너 배치
  Given `/rank` 화면에서
  When 리스트 최하단까지 스크롤
  Then `AdSlot` 배너가 마지막 `rank-row` 아래에 렌더되고 `FloatingTabBar`와 겹치지 않도록 하단 여백이 확보됨(배너 bottom < 탭바 top)
- **AC-9 [W][P0]**: Scenario: 잘못된 페이로드 거절 (**400 INVALID_PAYLOAD**)
  Given 서버가 `POST /v1/scores`에 대해 `400 { error: "INVALID_PAYLOAD", message: "필수 필드가 누락되었습니다", field: "score" }`를 반환할 때
  When 응답 수신
  Then 재시도는 **0회**이고 `RankCache`는 갱신되지 않으며 Toast `"입력값을 다시 확인해주세요"`(`E_VALIDATION`, 400)가 1회 표시됨
  And 서버의 `message` 문자열은 화면에 표시되지 않고 `console.warn`에만 기록됨
- **AC-10 [W][P0]**: Scenario: 타입 불일치 거절 (**400 INVALID_TYPE**)
  Given 손상된 프로필로 인해 `score`가 문자열 `"137"`인 상태로 제출이 시도될 때
  When `submitScore()` 호출
  Then 클라이언트 사전 검증이 먼저 실패해 **네트워크 요청이 0회** 발생하고 `AppError { code: "E_TYPE_MISMATCH", httpStatus: 400, field: "score" }`를 반환함
  And 사전 검증을 우회해 서버가 `400 { error: "INVALID_TYPE" }`을 반환한 경우에도 재시도 0회, Toast `"입력값을 다시 확인해주세요"` 1회로 동일하게 처리됨
- **AC-11 [W][P0]**: Scenario: 인증 실패 (**401 UNAUTHORIZED**)
  Given `X-User-Key` 헤더가 누락되었거나 서버가 `401 { error: "UNAUTHORIZED" }`를 반환할 때
  When 응답 수신
  Then 재시도는 **0회**이고 `Flags.rankOptIn = false`, `Flags.rankDisabledReason = "unauthenticated"`로 저장되며
  And `/rank` 상단에 배너 `"로그인 정보를 확인할 수 없어 랭킹은 이 기기에만 저장돼요"`(`E_UNAUTHENTICATED`, 401)가 표시되고 로컬 주간 점수만 렌더됨
  And 이후 자동 재제출은 발생하지 않으며(호출 0회), 사용자가 `Switch`로 재동의할 때만 다시 시도함
- **AC-12 [W][P0]**: Scenario: 타인 기록 접근 차단 (**403 FORBIDDEN**)
  Given `X-User-Key`와 `body.userKey`(또는 `query.userKey`)가 불일치해 서버가 `403 { error: "FORBIDDEN" }`을 반환할 때
  When 응답 수신
  Then 재시도는 **0회**, `RankCache`는 갱신되지 않고 `Flags.rankDisabledReason = "forbidden"`으로 저장되며
  And 배너 `"다른 사용자의 기록에는 접근할 수 없어요"`(`E_FORBIDDEN`, 403)가 표시되고 로컬 `Profile.userKey`를 헤더/바디에 재동기화한 뒤 **다음 사용자 조작 시점**에만 재시도함(자동 재요청 0회)
- **AC-13 [W][P0]**: Scenario: 존재하지 않는 주차 (**404 WEEK_NOT_FOUND**)
  Given `GET /v1/leaderboard?weekKey=2026-W35`가 `404 { error: "WEEK_NOT_FOUND" }`를 반환할 때
  When 응답 수신
  Then 재시도는 **0회**이고 `Asset.ContentIcon` + `"이번 주 랭킹이 아직 없어요"`(`E_NOT_FOUND`, 404) 빈 상태가 렌더되며 `rank-row`는 0개임
  And `"다시 시도"` 버튼은 렌더되지 않고(정상 상태이므로) 내 로컬 주간 점수는 `rank-hero`에 그대로 표시됨
- **AC-14 [W][P0]**: Scenario: 중복 제출 (**409 DUPLICATE_SUBMISSION**)
  Given 동일 `(userKey, weekKey, score)` 제출이 60초 내 재전송되어 서버가 `409 { error: "DUPLICATE_SUBMISSION", rank: 12, total: 340 }`를 반환할 때
  When 응답 수신
  Then 재시도는 **0회**이고 응답의 `rank/total`로 `RankCache`가 정상 갱신되며 **에러 UI(Toast·배너)는 표시되지 않음**
  And `console.warn("[FQD] E_CONFLICT_DUPLICATE scores")` 1건만 출력됨
- **AC-15 [W][P0]**: Scenario: 점수 역행 충돌 (**409 SCORE_REGRESSION**)
  Given 서버에 `storedScore: 200`이 있는데 로컬이 `score: 137`을 제출해 `409 { error: "SCORE_REGRESSION", storedScore: 200, rank: 8, total: 340 }`를 반환할 때
  When 응답 수신
  Then 재시도는 **0회**이고 `RankCache.me.score = 200`, `RankCache.me.rank = 8`로 서버 값을 채택해 저장하며 에러 Toast는 표시되지 않음
  And 로컬 `Profile.totalScore`는 변경되지 않음
- **AC-16 [W][P1]**: Scenario: 요청 과다 (**429 RATE_LIMITED**)
  Given 서버가 `429 { error: "RATE_LIMITED" }` + 헤더 `Retry-After: 3`을 반환할 때
  When 응답 수신
  Then 3초 대기 후 **정확히 1회** 재시도하고, 재시도도 429이면 중단하며 Toast `"요청이 많아요. 잠시 후 다시 시도해주세요"`(`E_RATE_LIMITED`, 429)가 1회 표시됨
  And `Retry-After`가 없거나 60 초과이면 대기 시간을 **60초로 캡**하고, 대기 중에는 `"다시 시도"` 버튼이 `disabled` 상태를 유지함
- **AC-17 [W][P1]**: Scenario: 타임아웃 (**408 대응**)
  Given `GET /v1/leaderboard`가 5000ms 내 응답하지 않을 때
  When `AbortController`가 요청을 중단
  Then 1000ms 후 **정확히 1회** 재시도하고, 재시도도 타임아웃이면 캐시 폴백(AC-4)으로 전환하며 배너 문구는 `"네트워크가 불안정해요. 잠시 후 다시 시도해주세요"`(`E_TIMEOUT`, 408)를 사용함
  And 총 소요 시간이 12000ms를 넘지 않고 스켈레톤이 무한 표시되지 않음
- **AC-18 [W][P1]**: Scenario: 서버 점검 (**503 SERVICE_UNAVAILABLE**)
  Given 서버가 `503 { error: "SERVICE_UNAVAILABLE" }`를 반환할 때
  When 1회 재시도도 503으로 실패
  Then `Flags.rankDisabledReason = "unavailable"`로 저장되고 배너 `"랭킹 서버 점검 중이에요"`(`E_UNAVAILABLE`, 503)가 표시되며 로컬 주간 점수 뷰로 폴백함
  And 해당 세션 동안 자동 재조회는 발생하지 않고(추가 호출 0회), `"다시 시도"` 버튼 탭 시에만 재요청함
- **AC-19 [W][P1]**: Scenario: 오프라인 / CORS 차단 (**대응 상태코드 0**)
  Given `fetch`가 `TypeError: Failed to fetch`로 거부될 때(기내모드 또는 CORS 헤더 누락)
  When 1회 재시도도 실패
  Then 배너 `"인터넷 연결을 확인해주세요"`(`E_OFFLINE`, 0)와 함께 캐시 또는 로컬 점수 뷰가 렌더되고 `console.error` 0건
  And `navigator.onLine === false`인 경우에는 요청 자체를 생략해 네트워크 호출이 **0회**임
- **AC-20 [W][P0]**: Scenario: 200이지만 스키마가 깨진 응답 (대응 상태코드 **422**)
  Given `GET /v1/leaderboard`가 `200`으로 `{ "entries": "not-an-array" }` 또는 비-JSON 본문을 반환할 때
  When 응답 파싱
  Then 응답을 폐기하고 `AppError { code: "E_SCHEMA_INVALID", httpStatus: 422 }`로 처리해 캐시 폴백(AC-4)을 수행하며 `RankCache`는 덮어쓰지 않음
  And `entries` 중 개별 항목만 스키마 위반이면 해당 항목만 제외하고 나머지를 렌더하며, 유효 항목이 0개면 `"이번 주 랭킹이 아직 없어요"` 빈 상태를 표시함
- **AC-21 [W][P1]**: Scenario: limit 파라미터 방어 (**400 INVALID_LIMIT**)
  Given 내부 호출이 `limit = 0` 또는 `limit = 999`로 시도될 때
  When `fetchLeaderboard()` 실행
  Then 클라이언트가 `1~50` 범위로 클램프해 요청하므로 서버 `400 INVALID_LIMIT` 응답은 발생하지 않으며, 클램프 시 `console.warn` 1건만 남김
  And 그럼에도 서버가 `400 { error: "INVALID_LIMIT" }`을 반환하면 재시도 0회, 캐시 폴백으로 처리함
- **AC-22 [W][P1]**: Scenario: 미배포 환경 (로컬 전용 모드)
  Given `VITE_LEADERBOARD_API_BASE`가 빈 문자열이거나 `https://`로 시작하지 않을 때
  When `/rank` 진입 및 데일리 완료
  Then 네트워크 호출이 **0회**이고 `rank-hero`에 로컬 주간 점수만 표시되며 배너 `"랭킹 서버 점검 중이에요"`가 아닌 안내 문구 `"이번 주 랭킹이 아직 없어요"`가 표시됨
  And `console.warn`·`console.error` 모두 0건(정상 구성으로 간주)

---

### F8. 점수 공유 카드

- **Description**: 오늘의 결과를 친구와 비교할 수 있는 텍스트 공유 카드를 생성한다. 이모지 격자(⭕️/❌)로 3문항 결과를 표현하고 점수·스트릭·주간 순위를 포함하며, 클립보드 복사 방식으로 외부 도메인 이탈 없이 공유한다.
- **Data**: `DailySession`, `Profile`, `RankCache`, `Flags.lastShareAt`
- **API**: 없음

**Requirements**
- **AC-1 [E][P0]**: Scenario: 공유 텍스트 생성
  Given `DailySession = { dateKey: "2026-08-26", answers: [정답, 오답, 정답], score: 38 }`, `streak = 4` 일 때
  When `/share` 진입
  Then `data-testid="share-preview"` 안에 정확히 다음 텍스트가 렌더됨:
  `"FinQuizDaily 2026-08-26\n⭕️❌⭕️  2/3\n오늘 38점 · 4일 연속 🔥"`
- **AC-2 [E][P0]**: Scenario: 클립보드 복사
  Given 공유 카드가 표시된 상태
  When `"복사하기"` 버튼을 탭
  Then `navigator.clipboard.writeText`가 미리보기와 동일한 문자열로 1회 호출되고 Toast `"복사했어요! 친구에게 붙여넣어 보세요"`가 표시됨
  And `Flags.lastShareAt`가 현재 epoch ms로 저장됨
- **AC-3 [W][P0]**: Scenario: 외부 이동 없는 공유
  Given `/share` 화면 소스에서
  When 공유 관련 코드에 대해 정적 검사 실행
  Then `window.open`, `window.location.href`, `<a href="http...">` 사용이 **0건**이며 공유는 클립보드 복사로만 수행됨
- **AC-4 [W][P1]**: Scenario: 클립보드 API 미지원/거부 (대응 상태코드 **0 / 로컬 `E_CLIPBOARD_FAILED`**)
  Given `navigator.clipboard`가 `undefined`이거나 `writeText`가 reject 될 때
  When `"복사하기"` 탭
  Then Toast `"복사에 실패했어요. 아래 텍스트를 길게 눌러 복사해주세요"`가 표시되고, 텍스트가 `readOnly` TDS `TextField`(multiline)로 노출되어 수동 선택이 가능함
  And `Flags.lastShareAt`는 갱신되지 않고 `console.error` 0건
- **AC-5 [O][P1]**: Scenario: 랭킹 정보 선택 포함
  Where `rankOptIn === true` 이고 `RankCache.me.rank`가 존재할 때
  When 공유 텍스트 생성
  Then 마지막 줄에 `"이번 주 12위 / 340명"` 형식의 한 줄이 추가되고, `me`가 `null`이면 해당 줄이 생략됨
- **AC-6 [W][P1]**: Scenario: 미완료 상태 진입 (대응 상태코드 **409**)
  Given 오늘 세션이 없거나 `status !== "completed"` 인 상태
  When `/share` 진입
  Then 공유 카드 대신 `"오늘의 퀴즈를 먼저 완료해주세요"`(`E_CONFLICT_STATE`, 409) 빈 상태와 `"퀴즈 풀러 가기"` 버튼이 표시되고, `"복사하기"` 버튼은 렌더되지 않음
- **AC-7 [U][P1]**: Scenario: 개인정보 미포함
  Given 공유 텍스트가 생성될 때
  When 문자열을 검사
  Then `userKey`, 이메일, 전화번호 형식의 문자열이 포함되지 않으며 닉네임 외 식별 정보가 없음
- **AC-8 [W][P0]**: Scenario: 손상된 답안으로 공유 텍스트 생성 (대응 상태코드 **422**)
  Given 오늘 세션이 `completed`이지만 `answers.length === 2`(1건 유실)일 때
  When `/share` 진입
  Then 유실 문항은 `❌`로 채워 이모지 총 개수를 **정확히 3개**로 유지하고 `"1/3"` 형식으로 실제 정답 수를 표기하며 예외가 발생하지 않음
  And `console.warn("[FQD] E_SCHEMA_INVALID share")` 1건만 출력됨
- **AC-9 [W][P1]**: Scenario: 캐시 순위가 다른 주차일 때 (대응 상태코드 **404**)
  Given `RankCache.weekKey`가 오늘 `weekKey`와 다를 때
  When 공유 텍스트 생성
  Then 순위 줄(`"이번 주 N위 / M명"`)이 **생략**되고 나머지 3줄만 생성됨
  And 사용자에게 별도 에러 UI는 표시되지 않음
- **AC-10 [W][P1]**: Scenario: 잘못된 dateKey state (대응 상태코드 **400**)
  Given `location.state = { dateKey: 20260826 }`(숫자) 로 진입
  When 검증 실행
  Then 오늘 `dateKey`로 폴백해 정상 렌더하고, 오늘 세션이 미완료면 AC-6의 빈 상태를 표시함
  And `console.warn` 1건만 출력되고 화면 크래시는 없음

---

### F9. 공통 에러 처리 레이어 (v1.1 신설)

- **Description**: `AppError`·Error Catalog·런타임 스키마 가드(`parseX`)·`apiFetch`(타임아웃/재시도/상태코드→코드 매핑)·전역 `ErrorBoundary`·에러 표시 훅(`useErrorToast`)을 구현한다. F1~F8의 모든 에러 AC가 이 레이어를 통해 동작한다. **UI 화면은 `ErrorBoundary` 폴백 1개만 포함한다.**
- **Data**: 없음(순수 유틸 + 1개 폴백 컴포넌트)
- **API**: 없음(래퍼만 제공)

**Requirements**
- **AC-1 [U][P0]**: Scenario: 상태코드 → 에러코드 매핑 완전성
  Given `mapHttpError(status, body)` 유틸에 대해
  When `400/401/403/404/408/409/413/415/422/429/500/502/503/504` 및 `0`(네트워크)을 각각 입력
  Then 모두 Error Catalog의 코드로 매핑되어 `AppError`를 반환하고, 매핑되지 않는 status(예: `418`)는 `E_SERVER`(500 취급)로 폴백하며 `undefined`를 반환하지 않음
  And 각 결과의 `userMessage`가 Error Catalog 표의 문자열과 **정확히 일치**함
- **AC-2 [U][P0]**: Scenario: 재시도 정책 (대응 상태코드 전체)
  Given `apiFetch`가 각 상태코드를 반환하는 목 서버에 요청할 때
  When 호출 종료
  Then `400/401/403/404/409/413/415`는 총 요청 **1회**, `408/429/500/502/503/504`·네트워크 실패는 총 **2회**이며, 재시도 간격은 1000ms(429는 `Retry-After` 우선, 최대 60000ms)임
- **AC-3 [U][P0]**: Scenario: 타임아웃 강제 중단 (대응 상태코드 **408**)
  Given 목 서버가 10000ms 동안 응답하지 않을 때
  When `apiFetch`를 호출
  Then 5000ms 시점에 `AbortController.abort()`가 호출되고 `AppError { code: "E_TIMEOUT", httpStatus: 408 }`로 종료되며, 지연된 응답이 나중에 도착해도 상태를 갱신하지 않음
- **AC-4 [U][P0]**: Scenario: 스키마 가드 반환 규약 (대응 상태코드 **422**)
  Given `parseSession(input)`에 필수 키 누락·타입 불일치·범위 초과 입력을 각각 전달
  When 실행
  Then 예외를 던지지 않고 `Result<DailySession>`을 반환하며 실패 시 `error.code`가 각각 `E_VALIDATION`(400), `E_TYPE_MISMATCH`(400), `E_SCHEMA_INVALID`(422)임
  And 성공 시 반환 객체에는 스키마에 정의되지 않은 키가 포함되지 않음(화이트리스트 파싱)
- **AC-5 [W][P0]**: Scenario: 전역 ErrorBoundary (대응 상태코드 **500**)
  Given 라우트 컴포넌트가 렌더 중 `throw new Error("boom")` 하는 상태
  When 해당 라우트로 이동
  Then `data-testid="app-error-boundary"`에 `"화면을 표시하지 못했어요"` + `"홈으로 돌아가기"` 버튼이 렌더되고, 버튼 탭 시 `navigate('/', { replace: true })` 후 정상 화면이 복구됨
  And `console.error` 0건, `console.warn` 1건
- **AC-6 [W][P0]**: Scenario: 처리되지 않은 Promise 거부 (대응 상태코드 **500**)
  Given 앱 어딘가에서 `Promise.reject(new Error("x"))`가 발생할 때
  When `window.onunhandledrejection` 핸들러가 동작
  Then 화면은 그대로 유지되고 `console.warn("[FQD] E_SERVER unhandled")` 1건만 기록되며 `console.error`·화이트스크린이 발생하지 않음
- **AC-7 [U][P1]**: Scenario: Toast 중복 억제
  Given 동일 `code`의 `AppError`가 1초 내 5회 표시 요청될 때
  When `useErrorToast`가 처리
  Then 화면에 표시되는 Toast는 **1개**이며 나머지 4건은 무시됨(로그는 5건)
- **AC-8 [U][P1]**: Scenario: 서버 메시지 미노출
  Given API가 `{ error: "INTERNAL_ERROR", message: "<img src=x onerror=alert(1)>" }` 를 반환할 때
  When 에러 UI가 렌더됨
  Then 화면 텍스트는 `"서버에 문제가 생겼어요. 잠시 후 다시 시도해주세요"`이며 서버 `message` 문자열은 DOM 어디에도 존재하지 않음
- **AC-9 [U][P1]**: Scenario: 로깅 포맷 고정
  Given 임의의 `AppError`가 처리될 때
  When 로깅이 수행됨
  Then `console.warn`이 `"[FQD] {code} {httpStatus} {context}"` 단일 문자열 형태로 1회 호출되고, `userKey`·닉네임 등 식별 정보는 로그에 포함되지 않음

---

*(다음 Part 3에서 Screen Definitions(S1~S9, 에러 상태 AC 포함) · Route Map · Assumptions · Open Questions를 이어서 출력합니다.)*