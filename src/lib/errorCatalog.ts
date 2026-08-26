// Error catalog — single source for all error codes in SPEC F9.
// Pure declarations + const data only, no runtime side effects.

export const ERROR_CATALOG = {
  E_VALIDATION: { httpStatus: 400, userMessage: "입력값을 다시 확인해주세요" },
  E_TYPE_MISMATCH: { httpStatus: 400, userMessage: "입력값을 다시 확인해주세요" },
  E_UNAUTHENTICATED: {
    httpStatus: 401,
    userMessage: "로그인 정보를 확인할 수 없어 랭킹은 이 기기에만 저장돼요",
  },
  E_FORBIDDEN: { httpStatus: 403, userMessage: "다른 사용자의 기록에는 접근할 수 없어요" },
  E_NOT_FOUND: { httpStatus: 404, userMessage: "문제를 찾을 수 없어요" },
  E_TIMEOUT: { httpStatus: 408, userMessage: "네트워크가 불안정해요. 잠시 후 다시 시도해주세요" },
  E_CONFLICT_DUPLICATE: { httpStatus: 409, userMessage: "복습완료" },
  E_CONFLICT_STATE: { httpStatus: 409, userMessage: "오늘의 퀴즈를 먼저 완료해주세요" },
  E_LIMIT_EXCEEDED: { httpStatus: 400, userMessage: "입력값을 다시 확인해주세요" },
  E_SCHEMA_INVALID: { httpStatus: 422, userMessage: "데이터 형식이 올바르지 않아요" },
  E_RATE_LIMITED: { httpStatus: 429, userMessage: "요청이 많아요. 잠시 후 다시 시도해주세요" },
  E_SERVER: { httpStatus: 500, userMessage: "서버에 문제가 생겼어요. 잠시 후 다시 시도해주세요" },
  E_UNAVAILABLE: { httpStatus: 503, userMessage: "랭킹 서버 점검 중이에요" },
  E_OFFLINE: { httpStatus: 0, userMessage: "인터넷 연결을 확인해주세요" },
  E_CLIPBOARD_FAILED: {
    httpStatus: 0,
    userMessage: "복사에 실패했어요. 아래 텍스트를 길게 눌러 복사해주세요",
  },
} as const;

export type ErrorCode = keyof typeof ERROR_CATALOG;

export type AppError = {
  code: ErrorCode;
  httpStatus: number;
  userMessage: string;
  field?: string;
  context?: string;
};
