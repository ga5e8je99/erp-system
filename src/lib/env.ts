import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required to connect to PostgreSQL")
    .refine(
      (val) => val.startsWith("postgresql://") || val.startsWith("postgres://"),
      "DATABASE_URL must start with postgresql:// or postgres://"
    ),

  AUTH_SECRET: z
    .string()
    .min(16, "AUTH_SECRET is required and must be at least 16 characters long for security"),

  AUTH_TRUST_HOST: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((val) => {
      if (typeof val === "boolean") return val;
      if (typeof val === "string") return val.toLowerCase() === "true" || val === "1";
      return true;
    }),

  NEXT_PUBLIC_APP_URL: z
    .string()
    .default("http://localhost:3000")
    .transform((val) => {
      if (!val) return "http://localhost:3000";
      if (!val.startsWith("http://") && !val.startsWith("https://")) {
        return `https://${val}`;
      }
      return val;
    }),

  CRON_SECRET: z
    .string()
    .min(1)
    .default("masar_cron_secret"),

  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  ADMIN_INITIAL_PASSWORD: z
    .string()
    .min(8, "ADMIN_INITIAL_PASSWORD should be at least 8 characters")
    .optional(),

  SEED_DEMO_DATA: z
    .string()
    .optional(),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  // In the browser, provide safe client-side stubs without exposing server secrets
  if (typeof window !== "undefined") {
    return {
      DATABASE_URL: "",
      AUTH_SECRET: "client-safe-auth-secret-placeholder-for-browser",
      AUTH_TRUST_HOST: true,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      CRON_SECRET: "",
      NODE_ENV: "production",
    } as Env;
  }

  // During build phase or test runner without explicit env, provide safe local defaults
  const isBuildOrTest =
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.NODE_ENV === "test" ||
    Boolean(process.env.VITEST);

  const fallbackAppUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  let rawDatabaseUrl =
    process.env.DATABASE_URL ||
    (isBuildOrTest
      ? "postgresql://postgres:postgres@localhost:5432/masar_erp?schema=public"
      : undefined);

  // If deployed to Vercel at runtime, localhost is invalid
  if (
    !isBuildOrTest &&
    Boolean(process.env.VERCEL) &&
    rawDatabaseUrl &&
    (rawDatabaseUrl.includes("localhost") || rawDatabaseUrl.includes("127.0.0.1"))
  ) {
    const errorMsg = `
========================================================================
🚨 VERCEL DEPLOYMENT CONFIGURATION ERROR: LOCALHOST DATABASE_URL DETECTED
========================================================================
The application is running in Vercel Serverless environment, but DATABASE_URL
is set to localhost ("${rawDatabaseUrl}").

Vercel functions cannot connect to localhost. You must provide a hosted
cloud PostgreSQL connection string (such as Neon, Supabase, or AWS RDS).

👉 Fix in Vercel Dashboard:
   1. Open your project in https://vercel.com
   2. Go to Settings -> Environment Variables
   3. Update DATABASE_URL to your hosted cloud PostgreSQL URL
   4. Trigger a Redeploy
========================================================================
`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  const rawEnv = {
    DATABASE_URL: rawDatabaseUrl,
    AUTH_SECRET:
      process.env.AUTH_SECRET ||
      (isBuildOrTest
        ? "test-secret-key-at-least-32-chars-long-for-testing"
        : undefined),
    AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST ?? "true",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || fallbackAppUrl,
    CRON_SECRET: process.env.CRON_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    ADMIN_INITIAL_PASSWORD: process.env.ADMIN_INITIAL_PASSWORD,
    SEED_DEMO_DATA: process.env.SEED_DEMO_DATA,
  };

  const parsed = envSchema.safeParse(rawEnv);

  if (!parsed.success) {
    const isVercel = Boolean(process.env.VERCEL);
    const issues = parsed.error.issues.map((i) => `  ❌ ${i.path.join(".")}: ${i.message}`).join("\n");
    const errorMessage = `
========================================================================
🚨 FATAL STARTUP CONFIGURATION ERROR: INVALID ENVIRONMENT VARIABLES
========================================================================
The application failed to start because one or more required environment
variables are missing or malformed:

${issues}

👉 Action Required:
${
  isVercel
    ? `   - On Vercel: Go to Project Settings -> Environment Variables.
   - Add DATABASE_URL (connection string from Neon / Supabase / Postgres).
   - Add AUTH_SECRET (random string at least 32 characters).
   - Ensure AUTH_TRUST_HOST is set to true.
   - Trigger a Redeploy under the Deployments tab.`
    : `   - For local development: Verify your .env file has all required keys.
   - For production / Docker: Set environment variables in docker-compose.yml or cloud panel.
   - Refer to .env.example for template values.`
}
========================================================================
`;
    // Fail fast with clear diagnostic message
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  return parsed.data;
}

export const env = parseEnv();
