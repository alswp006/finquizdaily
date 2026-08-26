// HTTP status → AppError mapping + fixed-format logger.
// Pure mapping table; no fetch/network logic here (that lives in apiFetch.ts).
// Codes/messages are sourced from the single canonical ERROR_CATALOG (packet 0002) —
// never redefine a parallel catalog here, or downstream consumers (rankApi, share, notes)
// that key off these exact codes silently diverge.

import type { AppError } from "@/lib/types";
import { ERROR_CATALOG, type ErrorCode } from "@/lib/errorCatalog";

// 413/415 never occur in this app's actual API contract (no file-upload/content-type
// endpoints) and so were intentionally left out of ERROR_CATALOG — kept here as a local,
// non-canonical extension purely so apiFetch's non-retry status set stays mappable.
type LocalOnlyCode = "E_PAYLOAD_TOO_LARGE" | "E_UNSUPPORTED_MEDIA";
const LOCAL_ONLY_CATALOG: Record<LocalOnlyCode, { httpStatus: number; userMessage: string }> = {
  E_PAYLOAD_TOO_LARGE: { httpStatus: 413, userMessage: "요청 데이터가 너무 커요" },
  E_UNSUPPORTED_MEDIA: { httpStatus: 415, userMessage: "지원하지 않는 형식이에요" },
};

const STATUS_TO_CODE: Record<number, ErrorCode | LocalOnlyCode> = {
  400: "E_VALIDATION",
  401: "E_UNAUTHENTICATED",
  403: "E_FORBIDDEN",
  404: "E_NOT_FOUND",
  408: "E_TIMEOUT",
  409: "E_CONFLICT_DUPLICATE",
  413: "E_PAYLOAD_TOO_LARGE",
  415: "E_UNSUPPORTED_MEDIA",
  422: "E_SCHEMA_INVALID",
  429: "E_RATE_LIMITED",
  500: "E_SERVER",
  502: "E_SERVER",
  503: "E_UNAVAILABLE",
  504: "E_SERVER",
  0: "E_OFFLINE",
};

export function mapHttpError(statusCode: number, message?: string): AppError {
  const code = STATUS_TO_CODE[statusCode] ?? "E_SERVER";
  const catalogEntry: { httpStatus: number; userMessage: string } =
    code in ERROR_CATALOG ? ERROR_CATALOG[code as ErrorCode] : LOCAL_ONLY_CATALOG[code as LocalOnlyCode];
  return {
    code,
    message: message ?? catalogEntry.userMessage,
    statusCode: catalogEntry.httpStatus,
  };
}

export function logAppError(err: AppError, context: string): void {
  console.warn(`[FQD] ${err.code} ${err.statusCode ?? ""} ${context}`.trim());
}
