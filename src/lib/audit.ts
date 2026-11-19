import { headers } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { Prisma } from "@prisma/client";

export interface LogAuditOptions {
  action: string;
  entity: string;
  entityId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  userId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

export async function logAudit(options: LogAuditOptions): Promise<void> {
  try {
    let resolvedUserId = options.userId;
    let resolvedIp = options.ip;
    let resolvedUserAgent = options.userAgent;

    // Attempt to pull user from session if not explicitly provided
    if (!resolvedUserId) {
      try {
        const session = await auth();
        if (session?.user?.id) {
          resolvedUserId = session.user.id;
        }
      } catch {
        // Outside request context or not authenticated
      }
    }

    // Attempt to pull IP and User-Agent from headers if not provided
    if (!resolvedIp || !resolvedUserAgent) {
      try {
        const requestHeaders = await headers();
        if (!resolvedIp) {
          resolvedIp =
            requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            requestHeaders.get("x-real-ip") ||
            "127.0.0.1";
        }
        if (!resolvedUserAgent) {
          resolvedUserAgent = requestHeaders.get("user-agent") || undefined;
        }
      } catch {
        // Outside request context
        if (!resolvedIp) resolvedIp = "127.0.0.1";
      }
    }

    await db.auditLog.create({
      data: {
        action: options.action,
        entity: options.entity,
        entityId: options.entityId,
        before: (options.before as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        after: (options.after as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        userId: resolvedUserId ?? null,
        ip: resolvedIp ?? null,
        userAgent: resolvedUserAgent ?? null,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "[AUDIT LOG ERROR]");
  }
}

// Alias for compatibility
export const createAuditLog = logAudit;
