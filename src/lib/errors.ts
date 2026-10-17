export class AppError extends Error {
  constructor(public status: number, message: string, public code = "ERROR", public details?: unknown) {
    super(message);
  }
}
export const badRequest = (m: string, details?: unknown) => new AppError(400, m, "BAD_REQUEST", details);
export const unauthorized = (m = "Please sign in to continue.") => new AppError(401, m, "UNAUTHORIZED");
export const forbidden = (m = "You do not have permission to perform this action.") => new AppError(403, m, "FORBIDDEN");
export const notFound = (m = "Not found.") => new AppError(404, m, "NOT_FOUND");
export const conflict = (m: string) => new AppError(409, m, "CONFLICT");
export const tooMany = (m = "Too many requests. Please wait and try again.") => new AppError(429, m, "RATE_LIMITED");
