/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { authorizeUser, handleJwtCallback } from "@/lib/auth";
import { db } from "@/lib/db";
import bcryptjs from "bcryptjs";
import { clearRateLimit } from "@/lib/rate-limit";

describe("Auth Security & Hardening", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await clearRateLimit("login:email:nonexistent@masar.local");
    await clearRateLimit("login:email:admin@masar.local");
    await clearRateLimit("login:ip:10.0.0.1");
    await clearRateLimit("login:ip:127.0.0.1");
  });

  describe("Backdoor Removal & DB Failures", () => {
    it("fails and returns null when DB is down, even with old demo credentials", async () => {
      vi.spyOn(db.user, "findUnique").mockRejectedValue(
        new Error("Can't reach database server at localhost:5432")
      );

      const oldDemoPassword = ["Admin@", "12345"].join("");
      const result = await authorizeUser({
        email: "admin@masar.local",
        password: oldDemoPassword,
      });

      // Backdoor removed: must return null, never grant a fallback session
      expect(result).toBeNull();
    });

    it("returns null for malformed credentials input", async () => {
      const result = await authorizeUser({
        email: "invalid-email-format",
        password: "",
      });

      expect(result).toBeNull();
    });
  });

  describe("Timing-Based User Enumeration Mitigation", () => {
    it("executes bcryptjs.compare against a dummy hash when user does not exist", async () => {
      vi.spyOn(db.user, "findUnique").mockResolvedValue(null);
      const compareSpy = vi.spyOn(bcryptjs, "compare");

      const result = await authorizeUser({
        email: "nonexistent@masar.local",
        password: "wrongpassword123",
      });

      expect(result).toBeNull();
      // Must call compare with the dummy hash to equalize response times
      expect(compareSpy).toHaveBeenCalledWith(
        "wrongpassword123",
        expect.stringMatching(/^\$2a\$10\$/)
      );
    });

    it("executes bcryptjs.compare against dummy hash when user exists but is deactivated", async () => {
      vi.spyOn(db.user, "findUnique").mockResolvedValue({
        id: "usr_inactive",
        name: "Inactive User",
        email: "inactive@masar.local",
        passwordHash: "$2a$10$realhashvaluehere",
        isActive: false,
        deletedAt: null,
        locale: "ar",
        role: { name: "Viewer", permissions: [] } as any,
      } as any);

      const compareSpy = vi.spyOn(bcryptjs, "compare");

      const result = await authorizeUser({
        email: "inactive@masar.local",
        password: "testpassword",
      });

      expect(result).toBeNull();
      expect(compareSpy).toHaveBeenCalled();
    });
  });

  describe("Session Freshness & Token Invalidation", () => {
    it("initializes token with user data and timestamp on initial sign in", async () => {
      const initialToken = {};
      const user = {
        id: "usr_123",
        name: "Test User",
        email: "test@masar.local",
        role: "Sales",
        permissions: ["sales.customer.view"],
        locale: "ar",
      };

      const token = await handleJwtCallback({ token: initialToken, user });
      expect(token).not.toBeNull();
      expect(token?.id).toBe("usr_123");
      expect(token?.role).toBe("Sales");
      expect(token?.refreshedAt).toBeGreaterThan(0);
    });

    it("invalidates session when user is deactivated in DB after 5 minutes", async () => {
      const expiredTimestamp = Date.now() - (6 * 60 * 1000); // 6 mins ago (> 5m)
      const token = {
        id: "usr_123",
        role: "Sales",
        permissions: ["sales.customer.view"],
        locale: "ar",
        refreshedAt: expiredTimestamp,
      };

      // Mock user in DB now has isActive: false
      vi.spyOn(db.user, "findUnique").mockResolvedValue({
        id: "usr_123",
        name: "Test User",
        email: "test@masar.local",
        isActive: false,
        deletedAt: null,
        locale: "ar",
        role: { name: "Sales", permissions: [] },
      } as any);

      const refreshed = await handleJwtCallback({ token });
      // Invalidation: must return null to destroy the session
      expect(refreshed).toBeNull();
    });

    it("invalidates session when user has been soft-deleted in DB after 5 minutes", async () => {
      const expiredTimestamp = Date.now() - (6 * 60 * 1000);
      const token = {
        id: "usr_123",
        role: "Sales",
        permissions: ["sales.customer.view"],
        locale: "ar",
        refreshedAt: expiredTimestamp,
      };

      // Mock user in DB now has deletedAt set
      vi.spyOn(db.user, "findUnique").mockResolvedValue({
        id: "usr_123",
        name: "Test User",
        email: "test@masar.local",
        isActive: true,
        deletedAt: new Date(),
        locale: "ar",
        role: { name: "Sales", permissions: [] },
      } as any);

      const refreshed = await handleJwtCallback({ token });
      expect(refreshed).toBeNull();
    });

    it("refreshes role and updated permissions from DB when token expires", async () => {
      const expiredTimestamp = Date.now() - (6 * 60 * 1000);
      const token = {
        id: "usr_123",
        role: "Viewer",
        permissions: [],
        locale: "ar",
        refreshedAt: expiredTimestamp,
      };

      // User was promoted to Admin in DB
      vi.spyOn(db.user, "findUnique").mockResolvedValue({
        id: "usr_123",
        name: "Promoted User",
        email: "promoted@masar.local",
        isActive: true,
        deletedAt: null,
        locale: "en",
        role: {
          name: "Super Admin",
          permissions: [{ permission: { key: "*" } }],
        },
      } as any);

      const refreshed = await handleJwtCallback({ token });
      expect(refreshed).not.toBeNull();
      expect(refreshed?.role).toBe("Super Admin");
      expect(refreshed?.permissions).toEqual(["*"]);
      expect(refreshed?.locale).toBe("en");
      expect(refreshed?.refreshedAt).toBeGreaterThan(expiredTimestamp);
    });
  });
});
