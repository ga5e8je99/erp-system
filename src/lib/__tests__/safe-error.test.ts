import { describe, it, expect, vi } from "vitest";
import { toSafeError } from "../safe-error";
import { ForbiddenError } from "../rbac";
import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";

describe("Safe Error Handler (toSafeError)", () => {
  it("maps ForbiddenError instance to FORBIDDEN", () => {
    const error = new ForbiddenError("inventory.stock.adjust");
    expect(toSafeError(error)).toBe("FORBIDDEN");
  });

  it("maps errors with name or message containing Unauthorized to UNAUTHORIZED", () => {
    const error = new Error("UNAUTHORIZED");
    expect(toSafeError(error)).toBe("UNAUTHORIZED");

    const namedError = { name: "UnauthorizedError", message: "User not logged in" };
    expect(toSafeError(namedError)).toBe("UNAUTHORIZED");
  });

  it("maps Prisma P2002 unique constraint error to DUPLICATE_RECORD", () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "6.0.0",
      meta: { target: ["code"] },
    });

    expect(toSafeError(prismaError)).toBe("DUPLICATE_RECORD");
  });

  it("maps Prisma P2003 foreign key constraint error to FOREIGN_KEY_CONSTRAINT_FAILED", () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError("Foreign key constraint failed", {
      code: "P2003",
      clientVersion: "6.0.0",
      meta: { field_name: "departmentId" },
    });

    expect(toSafeError(prismaError)).toBe("FOREIGN_KEY_CONSTRAINT_FAILED");
  });

  it("maps Prisma P2025 record not found error to NOT_FOUND", () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError("Record to update not found", {
      code: "P2025",
      clientVersion: "6.0.0",
    });

    expect(toSafeError(prismaError)).toBe("NOT_FOUND");
  });

  it("preserves known safe application codes", () => {
    expect(toSafeError("VALIDATION_ERROR")).toBe("VALIDATION_ERROR");
    expect(toSafeError("RESERVED_ROLE_NAME")).toBe("RESERVED_ROLE_NAME");
    expect(toSafeError("INSUFFICIENT_STOCK")).toBe("INSUFFICIENT_STOCK");
    expect(toSafeError("RATE_LIMITED:60")).toBe("RATE_LIMITED:60");
  });

  it("hides unknown internal error messages, logs via logger, and returns fallback", () => {
    const loggerSpy = vi.spyOn(logger, "error");
    const internalSqlError = new Error("FATAL: relation \"users\" does not exist at postgres.internal.net:5432");

    const result = toSafeError(internalSqlError, "CUSTOM_FALLBACK");

    // Must never leak table names, hostnames, or internal error text
    expect(result).toBe("CUSTOM_FALLBACK");
    expect(result).not.toContain("FATAL");
    expect(result).not.toContain("users");
    expect(result).not.toContain("postgres.internal.net");
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.objectContaining({ err: internalSqlError }),
      expect.any(String)
    );
  });
});
