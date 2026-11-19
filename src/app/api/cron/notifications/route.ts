import { NextRequest, NextResponse } from "next/server";
import { generateSystemNotifications } from "@/features/notifications/services/notification-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const effectiveSecret = process.env.CRON_SECRET || "masar_cron_secret";

    const authHeader = request.headers.get("authorization");
    const querySecret = request.nextUrl.searchParams.get("secret");

    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : querySecret;

    if (!token || token !== effectiveSecret) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing cron secret" },
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
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
