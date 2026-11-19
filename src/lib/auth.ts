import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcryptjs from "bcryptjs";
import { z } from "zod";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { checkRateLimit, recordFailedAttempt, clearRateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { authConfig } from "@/auth.config";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Precomputed 60-character bcrypt hash for timing-safe comparison on non-existent users
const DUMMY_HASH = "$2a$10$wT3w2W4mN0rB/1JmR0s8seT7uL3V7s8a9K7bF1X5Y9Z8A0B1C2D3E";

export async function authorizeUser(credentials: unknown, request?: unknown) {
  const parsed = loginSchema.safeParse(credentials);
  if (!parsed.success) {
    return null;
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  // Extract client IP address for dual-key rate limiting (Email + IP)
  let clientIp = "127.0.0.1";
  if (request && typeof (request as Request).headers?.get === "function") {
    const forwarded = (request as Request).headers.get("x-forwarded-for");
    clientIp = forwarded?.split(",")[0]?.trim() || "127.0.0.1";
  } else {
    try {
      const { headers } = await import("next/headers");
      const h = await headers();
      clientIp = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    } catch {
      clientIp = "127.0.0.1";
    }
  }

  const emailRateLimitKey = `login:email:${normalizedEmail}`;
  const ipRateLimitKey = `login:ip:${clientIp}`;

  // 1. Dual Rate Limiting Check: both Email and IP (5 attempts / 15 minutes)
  const [emailLimitCheck, ipLimitCheck] = await Promise.all([
    checkRateLimit(emailRateLimitKey, 5, 15 * 60 * 1000),
    checkRateLimit(ipRateLimitKey, 5, 15 * 60 * 1000),
  ]);

  if (emailLimitCheck.limited || ipLimitCheck.limited) {
    const retryAfter = Math.max(
      emailLimitCheck.retryAfterSeconds,
      ipLimitCheck.retryAfterSeconds
    );
    await logAudit({
      action: "LOGIN_RATE_LIMITED",
      entity: "User",
      entityId: normalizedEmail,
      ip: clientIp,
      after: {
        retryAfterSeconds: retryAfter,
        emailLimited: emailLimitCheck.limited,
        ipLimited: ipLimitCheck.limited,
      },
    });
    throw new Error(`RATE_LIMITED:${retryAfter}`);
  }

  // 2. Fetch User with Role and Permissions
  let user;
  try {
    user = await db.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });
  } catch (dbError) {
    logger.error({ err: dbError, email: normalizedEmail }, "Database query failed during authorize");
    return null;
  }

  // 3. User existence and timing-safe password verification
  if (!user || !user.isActive || user.deletedAt) {
    // Compare against dummy hash to prevent timing-based user enumeration attacks
    await bcryptjs.compare(password, DUMMY_HASH);

    await Promise.all([
      recordFailedAttempt(emailRateLimitKey),
      recordFailedAttempt(ipRateLimitKey),
    ]);

    await logAudit({
      action: "LOGIN_FAILED",
      entity: "User",
      entityId: normalizedEmail,
      ip: clientIp,
      after: { reason: "User not found or inactive" },
    });
    return null;
  }

  // Verify real user password asynchronously
  const isValid = await bcryptjs.compare(password, user.passwordHash);
  if (!isValid) {
    await Promise.all([
      recordFailedAttempt(emailRateLimitKey),
      recordFailedAttempt(ipRateLimitKey),
    ]);

    await logAudit({
      action: "LOGIN_FAILED",
      entity: "User",
      entityId: user.id,
      ip: clientIp,
      after: { reason: "Invalid credentials" },
    });
    return null;
  }

  // 4. Successful login: clear rate limits for both email and IP
  await Promise.all([
    clearRateLimit(emailRateLimitKey),
    clearRateLimit(ipRateLimitKey),
  ]);

  // Update lastLoginAt
  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Audit Log
  await logAudit({
    action: "LOGIN_SUCCESS",
    entity: "User",
    entityId: user.id,
    userId: user.id,
    ip: clientIp,
  });

  // Flatten permissions
  const permissions = user.role.permissions.map((rp) => rp.permission.key);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.name,
    permissions,
    locale: user.locale || "ar",
  };
}

export async function handleJwtCallback({
  token,
  user,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  token: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user?: any;
}) {
  if (user) {
    token.id = user.id;
    token.role = user.role;
    token.permissions = user.permissions;
    token.locale = user.locale;
    token.refreshedAt = Date.now();
    return token;
  }

  // Session freshness check: re-read user from DB every ~5 minutes
  const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
  const now = Date.now();
  const lastRefreshed = (token.refreshedAt as number) || 0;

  if (now - lastRefreshed > REFRESH_INTERVAL_MS && token.id) {
    try {
      const dbUser = await db.user.findUnique({
        where: { id: token.id as string },
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          deletedAt: true,
          locale: true,
          role: {
            select: {
              name: true,
              permissions: {
                select: {
                  permission: {
                    select: { key: true },
                  },
                },
              },
            },
          },
        },
      });

      // Invalidate session if user was deleted or disabled
      if (!dbUser || !dbUser.isActive || dbUser.deletedAt) {
        return null;
      }

      token.name = dbUser.name;
      token.email = dbUser.email;
      token.role = dbUser.role.name;
      token.permissions = dbUser.role.permissions.map((rp) => rp.permission.key);
      token.locale = dbUser.locale || "ar";
      token.refreshedAt = now;
    } catch (error) {
      logger.error({ err: error, userId: token.id }, "Failed to refresh user session from DB");
    }
  }

  return token;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  secret: env.AUTH_SECRET,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: authorizeUser,
    }),
  ],
  callbacks: {
    jwt: handleJwtCallback,
    session({ session, token }) {
      if (!token || !token.id) {
        return null as unknown as typeof session;
      }
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.permissions = token.permissions as string[];
        session.user.locale = token.locale as string;
      }
      return session;
    },
  },
  events: {
    async signOut(message) {
      if ("token" in message && message.token?.id) {
        await logAudit({
          action: "LOGOUT",
          entity: "User",
          entityId: message.token.id,
          userId: message.token.id,
        });
      }
    },
  },
});
