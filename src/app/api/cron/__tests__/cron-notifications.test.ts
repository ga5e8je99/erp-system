import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "../notifications/route";
import * as notificationService from "@/features/notifications/services/notification-service";

describe("Cron Notifications API Security (/api/cron/notifications)", () => {
  const TEST_SECRET = "test-cron-secret-key-at-least-24-characters-long";

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.CRON_SECRET = TEST_SECRET;
  });

  it("rejects request with missing Authorization header", async () => {
    const request = new NextRequest("http://localhost:3000/api/cron/notifications");
    const response = await GET(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toContain("Unauthorized");
  });

  it("rejects request passing secret via query string (?secret=...)", async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/cron/notifications?secret=${TEST_SECRET}`
    );
    const response = await GET(request);

    // Query parameters must be rejected to prevent secret leakage in logs/proxies
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toContain("Unauthorized");
  });

  it("rejects request with wrong Bearer secret", async () => {
    const request = new NextRequest("http://localhost:3000/api/cron/notifications", {
      headers: {
        authorization: "Bearer wrong-secret-key-1234567890",
      },
    });
    const response = await GET(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toContain("Unauthorized");
  });

  it("rejects request with non-Bearer authorization scheme", async () => {
    const request = new NextRequest("http://localhost:3000/api/cron/notifications", {
      headers: {
        authorization: `Basic ${Buffer.from(TEST_SECRET).toString("base64")}`,
      },
    });
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("rejects request when CRON_SECRET is unconfigured or empty on the server (no default secret)", async () => {
    process.env.CRON_SECRET = "";

    const request = new NextRequest("http://localhost:3000/api/cron/notifications", {
      headers: {
        authorization: "Bearer some-token-value-here",
      },
    });
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("accepts valid Bearer token and triggers notification generator", async () => {
    vi.spyOn(notificationService, "generateSystemNotifications").mockResolvedValue({
      lowStockCount: 2,
      overdueCount: 1,
      leaveRequestCount: 0,
    });

    const request = new NextRequest("http://localhost:3000/api/cron/notifications", {
      headers: {
        authorization: `Bearer ${TEST_SECRET}`,
      },
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.generated.total).toBe(3);
  });
});
