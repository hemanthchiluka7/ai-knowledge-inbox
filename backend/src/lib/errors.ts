export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_ITEM: 'DUPLICATE_ITEM',
  URL_NOT_ALLOWED: 'URL_NOT_ALLOWED',
  UPSTREAM_FETCH_FAILED: 'UPSTREAM_FETCH_FAILED',
  AI_PROVIDER_ERROR: 'AI_PROVIDER_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

const statusMap: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  DUPLICATE_ITEM: 409,
  URL_NOT_ALLOWED: 422,
  UPSTREAM_FETCH_FAILED: 502,
  AI_PROVIDER_ERROR: 502,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusMap[code];
    this.details = details;
  }
}
