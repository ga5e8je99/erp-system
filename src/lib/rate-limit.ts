import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export interface RateLimitResult {
  limited: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

// Cleanup stale records periodically
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
let lastCleanup = Date.now();

/**
 * Opportunistically cleans up stale rate limit entries from the database.
 */
async function opportunisticCleanup(windowMs: number): Promise<void> {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  try {
    const staleThreshold = new Date(now - Math.max(windowMs * 2, 24 * 60 * 60 * 1000));
    await db.rateLimit.deleteMany({
      where: {
        windowStart: { lt: staleThreshold },
      },
    });
  } catch (err) {
    logger.warn({ err }, "Opportunistic rate limit cleanup encountered error");
  }
}

/**
 * Checks if a given key is currently rate-limited in PostgreSQL.
 * Default: 5 attempts per 15 minutes.
 */
export async function checkRateLimit(
  key: string,
  limit = 5,
  windowMs = 15 * 60 * 1000
): Promise<RateLimitResult> {
  void opportunisticCleanup(windowMs);

  const now = Date.now();

  try {
    const record = await db.rateLimit.findUnique({
      where: { key },
    });

    if (!record) {
      return { limited: false, remaining: limit, retryAfterSeconds: 0 };
    }

    const elapsed = now - record.windowStart.getTime();

    // If outside the active window, reset/delete and allow
    if (elapsed > windowMs) {
      await db.rateLimit.delete({ where: { key } }).catch(() => {});
      return { limited: false, remaining: limit, retryAfterSeconds: 0 };
    }

    if (record.count >= limit) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((record.windowStart.getTime() + windowMs - now) / 1000)
      );
      return {
        limited: true,
        remaining: 0,
        retryAfterSeconds,
      };
    }

    return {
      limited: false,
      remaining: Math.max(0, limit - record.count),
      retryAfterSeconds: 0,
    };
  } catch (err) {
    logger.error({ err, key }, "Error checking rate limit in DB; defaulting to allowed");
    return { limited: false, remaining: limit, retryAfterSeconds: 0 };
  }
}

/**
 * Increments failed attempt counter for the key in PostgreSQL.
 */
export async function recordFailedAttempt(
  key: string,
  windowMs = 15 * 60 * 1000
): Promise<void> {
  const now = new Date();

  try {
    const existing = await db.rateLimit.findUnique({
      where: { key },
    });

    if (!existing || now.getTime() - existing.windowStart.getTime() > windowMs) {
      await db.rateLimit.upsert({
        where: { key },
        create: {
          key,
          count: 1,
          windowStart: now,
        },
        update: {
          count: 1,
          windowStart: now,
        },
      });
    } else {
      await db.rateLimit.update({
        where: { key },
        data: {
          count: { increment: 1 },
        },
      });
    }
  } catch (err) {
    logger.error({ err, key }, "Failed to record failed attempt in DB rate limit");
  }
}

/**
 * Clears failed attempt counter on successful login.
 */
export async function clearRateLimit(key: string): Promise<void> {
  try {
    await db.rateLimit.deleteMany({
      where: { key },
    });
  } catch (err) {
    logger.error({ err, key }, "Failed to clear rate limit in DB");
  }
}

/**
 * DB-backed rate limit check querying AuditLog for recent failed login attempts.
 * Supports multi-instance distributed rate limiting across serverless functions.
 */
export async function checkDbRateLimit(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  auditLogClient: { findMany: (args: any) => Promise<Array<{ createdAt: Date }>> },
  identifier: string,
  limit = 5,
  windowMs = 15 * 60 * 1000
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - windowMs);

  const failedAttempts = await auditLogClient.findMany({
    where: {
      action: "LOGIN_FAILED",
      entity: "User",
      entityId: identifier,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });

  const count = failedAttempts.length;
  if (count >= limit) {
    const oldestInWindow = failedAttempts[0]?.createdAt.getTime() || Date.now();
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldestInWindow + windowMs - Date.now()) / 1000)
    );
    return {
      limited: true,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  return {
    limited: false,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds: 0,
  };
}
