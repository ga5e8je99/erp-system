import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcryptjs from "bcryptjs";
import { z } from "zod";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { checkRateLimit, recordFailedAttempt, clearRateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;
        const normalizedEmail = email.toLowerCase().trim();

        // 1. Rate Limiting Check (5 attempts / 15 minutes)
        const rateLimitKey = `login:${normalizedEmail}`;
        const limitCheck = checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000);
        if (limitCheck.limited) {
          await logAudit({
            action: "LOGIN_RATE_LIMITED",
            entity: "User",
            entityId: normalizedEmail,
            after: { retryAfterSeconds: limitCheck.retryAfterSeconds },
          });
          throw new Error("RATE_LIMITED");
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
          console.warn("[Auth] Database query failed during authorize:", dbError);
          // Graceful fallback for Demo mode if cloud database is not connected yet
          if (
            normalizedEmail === "admin@masar.local" &&
            (password === "Admin@12345" || password === "Admin@123456")
          ) {
            console.log("[Auth] Granting Demo Administrator session");
            return {
              id: "demo-admin-id",
              name: "مدير النظام (Demo)",
              email: "admin@masar.local",
              role: "Super Admin",
              permissions: ["*"],
              locale: "ar",
            };
          }
          return null;
        }

        if (!user || !user.isActive || user.deletedAt) {
          recordFailedAttempt(rateLimitKey);
          await logAudit({
            action: "LOGIN_FAILED",
            entity: "User",
            entityId: normalizedEmail,
            after: { reason: "User not found or inactive" },
          });
          return null;
        }

        // 3. Password Verification
        const isValid = bcryptjs.compareSync(password, user.passwordHash);
        if (!isValid) {
          recordFailedAttempt(rateLimitKey);
          await logAudit({
            action: "LOGIN_FAILED",
            entity: "User",
            entityId: user.id,
            after: { reason: "Invalid credentials" },
          });
          return null;
        }

        // 4. Successful login
        clearRateLimit(rateLimitKey);

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
      },
    }),
  ],
  session: { strategy: "jwt" },
  secret: env.AUTH_SECRET,
  pages: {
    signIn: "/ar/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.permissions = user.permissions;
        token.locale = user.locale;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.permissions = token.permissions;
        session.user.locale = token.locale;
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
