import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, HEAD } from "../route";
import { db } from "@/lib/db";

type MockCompanySettings = Awaited<ReturnType<typeof db.companySettings.findFirst>>;

describe("Health Check API (/api/health)", () => {
  const TEST_SECRET = "secure-health-check-cron-secret-32-chars";

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.CRON_SECRET = TEST_SECRET;
  });

  describe("Public probe (unauthenticated)", () => {
    it("returns 200 with strictly only { status: 'healthy' } when DB is connected", async () => {
      vi.spyOn(db.companySettings, "findFirst").mockResolvedValue({ id: "settings-id" } as unknown as MockCompanySettings);

      const request = new NextRequest("http://localhost:3000/api/health");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();

      expect(body).toEqual({ status: "healthy" });
      // Must NOT leak system metadata in public response
      expect(body.version).toBeUndefined();
      expect(body.environment).toBeUndefined();
      expect(body.checks).toBeUndefined();
      expect(body.uptimeSeconds).toBeUndefined();
    });

    it("returns 503 with strictly only { status: 'unhealthy' } when DB is disconnected", async () => {
      vi.spyOn(db.companySettings, "findFirst").mockRejectedValue(new Error("Connection refused"));

      const request = new NextRequest("http://localhost:3000/api/health");
      const response = await GET(request);

      expect(response.status).toBe(503);
      const body = await response.json();

      expect(body).toEqual({ status: "unhealthy" });
      // Must NOT leak error details or system metadata to public
      expect(body.checks).toBeUndefined();
      expect(body.version).toBeUndefined();
      expect(body.environment).toBeUndefined();
    });
  });

  describe("Privileged probe (with Authorization: Bearer <CRON_SECRET>)", () => {
    it("returns 200 with diagnostics (latency, version, environment) when authorized", async () => {
      vi.spyOn(db.companySettings, "findFirst").mockResolvedValue({ id: "settings-id" } as unknown as MockCompanySettings);

      const request = new NextRequest("http://localhost:3000/api/health", {
        headers: {
          authorization: `Bearer ${TEST_SECRET}`,
        },
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();

      expect(body.status).toBe("healthy");
      expect(body.checks.database.status).toBe("connected");
      expect(typeof body.checks.database.latencyMs).toBe("number");
      expect(body.version).toBeDefined();
      expect(body.environment).toBeDefined();
      expect(body.uptimeSeconds).toBeGreaterThanOrEqual(0);
    });

    it("returns 503 with error diagnostics when DB is down and authorized", async () => {
      vi.spyOn(db.companySettings, "findFirst").mockRejectedValue(
        new Error("Database connection timeout")
      );

      const request = new NextRequest("http://localhost:3000/api/health", {
        headers: {
          authorization: `Bearer ${TEST_SECRET}`,
        },
      });
      const response = await GET(request);

      expect(response.status).toBe(503);
      const body = await response.json();

      expect(body.status).toBe("unhealthy");
      expect(body.checks.database.status).toBe("disconnected");
      expect(body.checks.database.error).toContain("Database connection timeout");
      expect(body.version).toBeDefined();
      expect(body.environment).toBeDefined();
    });
  });

  describe("HEAD probe", () => {
    it("returns 200 empty response on HEAD probe when healthy", async () => {
      vi.spyOn(db.companySettings, "findFirst").mockResolvedValue({ id: "settings-id" } as unknown as MockCompanySettings);
      const response = await HEAD();
      expect(response.status).toBe(200);
    });

    it("returns 503 on HEAD probe when DB fails", async () => {
      vi.spyOn(db.companySettings, "findFirst").mockRejectedValue(new Error("Down"));
      const response = await HEAD();
      expect(response.status).toBe(503);
    });
  });
});
