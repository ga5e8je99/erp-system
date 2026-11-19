import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }

  const providedToken = authHeader.slice(7).trim();
  if (!providedToken) return false;

  const expectedBuffer = Buffer.from(cronSecret);
  const providedBuffer = Buffer.from(providedToken);

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

export async function GET(request: NextRequest) {
  const authorized = isAuthorized(request);
  const startTime = performance.now();

  try {
    // Verify database connectivity by checking the company settings table
    await db.companySettings.findFirst({ select: { id: true } });
    const dbLatencyMs = Math.round(performance.now() - startTime);

    if (!authorized) {
      // Public response: strictly returns only { status }
      return NextResponse.json(
        { status: "healthy" },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        }
      );
    }

    // Authenticated privileged response with diagnostics and metadata
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

    if (!authorized) {
      // Public response on failure: strictly returns only { status } (no error details, version, latency)
      return NextResponse.json(
        { status: "unhealthy" },
        {
          status: 503,
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        }
      );
    }

    // Authenticated privileged response with error details
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
