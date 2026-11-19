import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit,
  checkDbRateLimit,
} from "../rate-limit";
import { db } from "@/lib/db";

describe("PostgreSQL-Backed Rate Limiting Service", () => {
  const emailKey = "login:email:testuser@example.com";
  const ipKey = "login:ip:192.168.1.100";

  beforeEach(async () => {
    vi.restoreAllMocks();
    await clearRateLimit(emailKey);
    await clearRateLimit(ipKey);
  });

  describe("Persistent checkRateLimit & recordFailedAttempt (Postgres RateLimit Table)", () => {
    it("permits initial requests with full remaining allowance", async () => {
      const result = await checkRateLimit(emailKey, 5, 60000);
      expect(result.limited).toBe(false);
      expect(result.remaining).toBe(5);
      expect(result.retryAfterSeconds).toBe(0);
    });

    it("tracks failed attempts in DB and decrements remaining quota", async () => {
      await recordFailedAttempt(emailKey, 60000);
      await recordFailedAttempt(emailKey, 60000);

      const result = await checkRateLimit(emailKey, 5, 60000);
      expect(result.limited).toBe(false);
      expect(result.remaining).toBe(3);
    });

    it("triggers rate limit after threshold reached (5 attempts) with retry-after calculation", async () => {
      for (let i = 0; i < 5; i++) {
        await recordFailedAttempt(emailKey, 60000);
      }

      const result = await checkRateLimit(emailKey, 5, 60000);
      expect(result.limited).toBe(true);
      expect(result.remaining).toBe(0);
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
      expect(result.retryAfterSeconds).toBeLessThanOrEqual(60);
    });

    it("clears rate limit counter in DB on successful authorization", async () => {
      for (let i = 0; i < 4; i++) {
        await recordFailedAttempt(emailKey, 60000);
      }

      await clearRateLimit(emailKey);

      const result = await checkRateLimit(emailKey, 5, 60000);
      expect(result.limited).toBe(false);
      expect(result.remaining).toBe(5);
    });

    it("rate limits IP and email independently", async () => {
      // 5 failed attempts from this IP for various different accounts
      for (let i = 0; i < 5; i++) {
        await recordFailedAttempt(ipKey, 60000);
      }

      // IP is now limited
      const ipResult = await checkRateLimit(ipKey, 5, 60000);
      expect(ipResult.limited).toBe(true);

      // But a clean email from another source is not yet limited on its own key
      const emailResult = await checkRateLimit(emailKey, 5, 60000);
      expect(emailResult.limited).toBe(false);
      expect(emailResult.remaining).toBe(5);
    });

    it("resets expired window when elapsed time exceeds windowMs", async () => {
      // Seed a record in DB with windowStart in the past (> 60s ago)
      const pastWindowStart = new Date(Date.now() - 70000);
      await db.rateLimit.upsert({
        where: { key: emailKey },
        create: {
          key: emailKey,
          count: 5,
          windowStart: pastWindowStart,
        },
        update: {
          count: 5,
          windowStart: pastWindowStart,
        },
      });

      const result = await checkRateLimit(emailKey, 5, 60000);
      expect(result.limited).toBe(false);
      expect(result.remaining).toBe(5);
    });

    it("handles DB query failure gracefully without crashing authentication flow", async () => {
      vi.spyOn(db.rateLimit, "findUnique").mockRejectedValueOnce(new Error("DB connection timeout"));

      const result = await checkRateLimit(emailKey, 5, 60000);
      expect(result.limited).toBe(false);
      expect(result.remaining).toBe(5);
    });
  });

  describe("DB-Backed Rate Limiter (AuditLog fallback)", () => {
    it("permits login when AuditLog has fewer than limit failed attempts", async () => {
      const mockAuditLog = {
        findMany: vi.fn().mockResolvedValue([
          { createdAt: new Date(Date.now() - 5000) },
          { createdAt: new Date(Date.now() - 2000) },
        ]),
      };

      const result = await checkDbRateLimit(mockAuditLog, "user@example.com", 5, 60000);
      expect(result.limited).toBe(false);
      expect(result.remaining).toBe(3);
    });

    it("blocks and rate limits when AuditLog has threshold reached (>= 5 failed attempts)", async () => {
      const oldestAttempt = new Date(Date.now() - 30000);
      const mockAuditLog = {
        findMany: vi.fn().mockResolvedValue([
          { createdAt: oldestAttempt },
          { createdAt: new Date(Date.now() - 25000) },
          { createdAt: new Date(Date.now() - 20000) },
          { createdAt: new Date(Date.now() - 15000) },
          { createdAt: new Date(Date.now() - 10000) },
        ]),
      };

      const result = await checkDbRateLimit(mockAuditLog, "user@example.com", 5, 60000);
      expect(result.limited).toBe(true);
      expect(result.remaining).toBe(0);
      expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(25);
      expect(result.retryAfterSeconds).toBeLessThanOrEqual(35);
    });
  });
});
