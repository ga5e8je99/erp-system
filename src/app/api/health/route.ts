import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = performance.now();

  try {
    // Verify database connectivity by checking the company settings table
    await db.companySettings.findFirst({ select: { id: true } });
    const dbLatencyMs = Math.round(performance.now() - startTime);

    const healthData = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      version: process.env.npm_package_version || "0.1.0",
      environment: process.env.NODE_ENV || "development",
      checks: {
        database: {
          status: "connected",
          latencyMs: dbLatencyMs,
        },
      },
    };

    return NextResponse.json(healthData, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Database connection failed";
    logger.error({ error }, "Health check failed: Database connection error");

    const unhealthyData = {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      version: process.env.npm_package_version || "0.1.0",
      environment: process.env.NODE_ENV || "development",
      checks: {
        database: {
          status: "disconnected",
          error: message,
        },
      },
    };

    return NextResponse.json(unhealthyData, {
      status: 503,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  }
}

export async function HEAD() {
  try {
    await db.companySettings.findFirst({ select: { id: true } });
    return new Response(null, { status: 200 });
  } catch {
    return new Response(null, { status: 503 });
  }
}
