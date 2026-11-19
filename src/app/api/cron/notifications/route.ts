import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { generateSystemNotifications } from "@/features/notifications/services/notification-service";

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
    // Constant-time execution even when lengths differ
    crypto.timingSafeEqual(providedBuf, providedBuf);
    return false;
  }

  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized: Missing Bearer token in Authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7).trim();
    const expectedSecret = env.CRON_SECRET || process.env.CRON_SECRET || "";

    if (!expectedSecret || !safeCompare(token, expectedSecret)) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid cron secret" },
        { status: 401 }
      );
    }

    const result = await generateSystemNotifications();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      generated: {
        lowStockNotifications: result.lowStockCount,
        overdueInvoiceNotifications: result.overdueCount,
        leaveRequestNotifications: result.leaveRequestCount,
        total: result.lowStockCount + result.overdueCount + result.leaveRequestCount,
      },
    });
  } catch (error: unknown) {
    logger.error({ err: error }, "Cron execution failed");
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
