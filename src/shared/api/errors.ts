export interface ApiErrorShape {
  httpStatus: number;
  code: string;
  message: string;
  requestId?: string;
  fieldErrors?: Record<string, string[]>;
  retryAfterSeconds?: number;
  cause?: unknown;
}

export class ApiError extends Error implements ApiErrorShape {
  readonly httpStatus: number;
  readonly code: string;
  readonly requestId?: string;
  readonly fieldErrors?: Record<string, string[]>;
  readonly retryAfterSeconds?: number;
  override readonly cause?: unknown;

  constructor(shape: ApiErrorShape) {
    super(shape.message);
    this.name = 'ApiError';
    this.httpStatus = shape.httpStatus;
    this.code = shape.code;
    this.requestId = shape.requestId;
    this.fieldErrors = shape.fieldErrors;
    this.retryAfterSeconds = shape.retryAfterSeconds;
    this.cause = shape.cause;
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}
