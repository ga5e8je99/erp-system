import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";

export const KNOWN_SAFE_CODES = new Set([
  "FORBIDDEN",
  "UNAUTHORIZED",
  "NOT_FOUND",
  "DUPLICATE_RECORD",
  "UNIQUE_CONSTRAINT_FAILED",
  "FOREIGN_KEY_CONSTRAINT_FAILED",
  "DATABASE_ERROR",
  "VALIDATION_ERROR",
  "RATE_LIMITED",
  "INVALID_CREDENTIALS",
  "RESERVED_ROLE_NAME",
  "ROLE_NOT_FOUND",
  "USER_NOT_FOUND",
  "INSUFFICIENT_STOCK",
  "PERIOD_CLOSED",
  "PERIOD_LOCKED",
  "NEGATIVE_STOCK_NOT_ALLOWED",
  "INVOICE_ALREADY_POSTED",
  "INVOICE_VOIDED",
  "RECEIPT_ALREADY_PROCESSED",
  "CANNOT_DELETE_ACTIVE_PERIOD",
]);

/**
 * Maps known application, authorization, and database errors to clean, safe error codes.
 * Logs unexpected errors via Pino and returns a safe fallback code, never leaking
 * raw error messages, stack traces, or SQL schema details to the client.
 */
export function toSafeError(
  error: unknown,
  fallback = "INTERNAL_ERROR"
): string {
  if (!error) {
    return fallback;
  }

  // If already a recognized safe code, return directly
  if (typeof error === "string") {
    if (KNOWN_SAFE_CODES.has(error) || error.startsWith("RATE_LIMITED")) {
      return error;
    }
  }

  if (typeof error === "object") {
    // 1. Authorization & RBAC Errors
    if ("name" in error) {
      if (error.name === "ForbiddenError") {
        return "FORBIDDEN";
      }
      if (error.name === "UnauthorizedError") {
        return "UNAUTHORIZED";
      }
    }

    // Check message for auth keywords
    if ("message" in error && typeof error.message === "string") {
      const msg = error.message;
      if (msg === "UNAUTHORIZED" || msg.includes("Unauthorized")) {
        return "UNAUTHORIZED";
      }
      if (msg === "FORBIDDEN" || msg.includes("Forbidden")) {
        return "FORBIDDEN";
      }
      if (msg.startsWith("RATE_LIMITED")) {
        return msg;
      }
      if (KNOWN_SAFE_CODES.has(msg)) {
        return msg;
      }
    }

    // 2. Prisma Database Errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case "P2002":
          logger.warn({ code: error.code, meta: error.meta }, "Prisma unique constraint violation");
          return "DUPLICATE_RECORD";
        case "P2003":
          logger.warn({ code: error.code, meta: error.meta }, "Prisma foreign key constraint violation");
          return "FOREIGN_KEY_CONSTRAINT_FAILED";
        case "P2025":
          return "NOT_FOUND";
        default:
          logger.error({ err: error, prismaCode: error.code }, "Prisma database error");
          return "DATABASE_ERROR";
      }
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      logger.error({ err: error }, "Prisma client validation error");
      return "VALIDATION_ERROR";
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      logger.error({ err: error }, "Prisma client initialization failure");
      return "DATABASE_ERROR";
    }
  }

  // 3. Unhandled error: log with full stack and return safe fallback
  logger.error({ err: error }, "Unhandled server action / route error");
  return fallback;
}
