export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_ROLE_SCOPE"
  | "AUTH_REQUIRED"
  | "INVALID_CREDENTIALS"
  | "MFA_REQUIRED"
  | "MFA_INVALID"
  | "INVITATION_INVALID"
  | "PERMISSION_DENIED"
  | "SCOPE_DENIED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: ApiErrorCode,
    message: string,
    public readonly details?: Array<Record<string, unknown>>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
