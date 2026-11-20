import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * Constant-time string comparison using crypto.timingSafeEqual
 * to protect against timing attacks.
 */
function safeCompare(provided: string, expected: string): boolean {
  if (!provided || !expected) return false;
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);

  if (providedBuf.length !== expectedBuf.length) {
    crypto.timingSafeEqual(providedBuf, providedBuf);
    return false;
  }

  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized: Missing Bearer token in Authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7).trim();
    const expectedSecret =
      process.env.CRON_SECRET !== undefined
        ? process.env.CRON_SECRET
        : env.CRON_SECRET || "";

    if (!expectedSecret || !safeCompare(token, expectedSecret)) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid cron secret" },
        { status: 401 }
      );
    }

    // 1. Replenish any demo stock that has fallen to zero or below reorder point
    const replenished = await db.stockLevel.updateMany({
      where: {
        quantity: {
          lte: new Prisma.Decimal(10),
        },
      },
      data: {
        quantity: new Prisma.Decimal(100),
      },
    });

    // 2. Clear old rate limits to ensure demo visitors never get locked out
    const clearedRateLimits = await db.rateLimit.deleteMany({
      where: {
        windowStart: {
          lt: new Date(Date.now() - 15 * 60 * 1000),
        },
      },
    });

    logger.info(
      { replenishedCount: replenished.count, clearedRateLimits: clearedRateLimits.count },
      "Demo maintenance cron executed successfully"
    );

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      replenishedStocks: replenished.count,
      clearedStaleRateLimits: clearedRateLimits.count,
    });
  } catch (error: unknown) {
    logger.error({ err: error }, "Demo reset cron execution failed");
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
