/**
 * 날짜 유틸 — 저장 키와 화면 표시 형식을 한곳에서 만든다.
 *
 * 빌드 타깃이 es2019(Android 7 / iOS 16)라 최신 API는 쓰지 않는다:
 * Intl.DateTimeFormat의 타임존 옵션, Array.prototype.at, structuredClone 금지.
 * 날짜 키는 항상 기기 로컬 기준이다 — toISOString()은 UTC라 자정 전후로 하루가 밀린다.
 */

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** 문자열·Date·손상된 값을 모두 유효한 로컬 Date로 정규화한다. 해석 불가면 오늘. */
function toLocalDate(value: string | Date): Date {
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? new Date() : value;
  }

  if (typeof value === "string" && DATE_KEY_PATTERN.test(value)) {
    // "2026-08-26"을 new Date()에 그대로 넣으면 UTC 자정으로 파싱돼 로컬에서 하루 밀린다.
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(5, 7));
    const day = Number(value.slice(8, 10));
    const parsed = new Date(year, month - 1, day);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * 날짜를 저장·조회용 키(YYYY-MM-DD, 로컬 기준)로 바꾼다.
 * 하루치 진행 상황·오답 기록은 모두 이 키로 묶는다.
 */
export function toDateKey(date: string | Date = new Date()): string {
  const local = toLocalDate(date);
  return `${local.getFullYear()}-${pad2(local.getMonth() + 1)}-${pad2(local.getDate())}`;
}

/** 오늘 날짜의 키(YYYY-MM-DD). 로더와 화면의 기본값으로 쓴다. */
export function getTodayDateString(): string {
  return toDateKey(new Date());
}

/**
 * 날짜 키에서 days일만큼 이동한 날짜 키를 반환한다(로컬 기준).
 * 연속 출석일(streak) 계산처럼 "하루 전" 날짜가 필요할 때, 문자열을 직접
 * new Date()로 파싱하면 UTC 자정으로 해석돼 하루 밀릴 수 있어 이 헬퍼를 거친다.
 */
export function addDays(date: string | Date, days: number): string {
  const local = toLocalDate(date);
  const shifted = new Date(local.getFullYear(), local.getMonth(), local.getDate() + days);
  return toDateKey(shifted);
}

/**
 * 주간 기록을 묶는 키(ISO-8601 주차, 예: "2026-W35").
 * 주의 시작은 월요일이고, 그 주의 목요일이 속한 해가 주차의 해다.
 */
export function weekKey(date: string | Date = new Date()): string {
  const local = toLocalDate(date);
  const thursday = new Date(local.getFullYear(), local.getMonth(), local.getDate());
  const mondayIndex = (thursday.getDay() + 6) % 7;
  thursday.setDate(thursday.getDate() - mondayIndex + 3);

  const isoYear = thursday.getFullYear();
  const firstThursday = new Date(isoYear, 0, 4);
  firstThursday.setDate(firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7) + 3);

  const week = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / MS_PER_WEEK);
  return `${isoYear}-W${pad2(week)}`;
}

/** 화면에 보여줄 날짜 문구. 올해면 "8월 26일", 지난 해면 "2025년 12월 3일". */
export function formatDate(date: string | Date): string {
  const local = toLocalDate(date);
  const month = local.getMonth() + 1;
  const day = local.getDate();

  if (local.getFullYear() === new Date().getFullYear()) {
    return `${month}월 ${day}일`;
  }
  return `${local.getFullYear()}년 ${month}월 ${day}일`;
}
