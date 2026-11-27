export interface ApiErrorOptions {
  detail?: unknown;
  retryAfter?: string;
}

export class ApiError extends Error {
  status: number;
  code: string;
  detail?: unknown;
  retryAfter?: string;
  constructor(status: number, code: string, message: string, options?: ApiErrorOptions) {
    super(message);
    this.status = status;
    this.code = code;
    this.detail = options?.detail;
    this.retryAfter = options?.retryAfter;
  }
}

