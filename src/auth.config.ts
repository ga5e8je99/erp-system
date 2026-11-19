import type { NextAuthConfig } from "next-auth";

/**
 * Edge-compatible Auth.js configuration for Next.js Middleware.
 * Does not import Node-only dependencies (Prisma, bcrypt, pino).
 */
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/ar/login",
  },
  session: { strategy: "jwt" },
  providers: [], // Credential provider attached in src/lib/auth.ts
  callbacks: {
    authorized({ auth }) {
      return Boolean(auth?.user);
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.permissions = user.permissions;
        token.locale = user.locale;
        token.refreshedAt = Date.now();
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.permissions = token.permissions as string[];
        session.user.locale = token.locale as string;
      }
      return session;
    },
  },
};
