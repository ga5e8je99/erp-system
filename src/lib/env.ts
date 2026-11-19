import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required to connect to PostgreSQL")
    .refine(
      (val) =>
        val.startsWith("postgresql://") ||
        val.startsWith("postgres://") ||
        val.startsWith("prisma+postgres://") ||
        val.startsWith("prisma://"),
      "DATABASE_URL must start with postgresql://, postgres://, or prisma+postgres://"
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

  const rawDatabaseUrl =
    process.env.DATABASE_URL ||
    process.env.PRISMA_DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    "postgresql://postgres:postgres@localhost:5432/masar_erp?schema=public";

  // If deployed to Vercel at runtime, notify if localhost database is detected
  if (
    !isBuildOrTest &&
    Boolean(process.env.VERCEL) &&
    (rawDatabaseUrl.includes("localhost") || rawDatabaseUrl.includes("127.0.0.1"))
  ) {
    console.warn(`
========================================================================
⚠️ [Masar ERP] VERCEL DEPLOYMENT WARNING: LOCALHOST DATABASE DETECTED
========================================================================
The application is running in Vercel Serverless environment, but DATABASE_URL
is set to localhost. Database queries will fail until a cloud PostgreSQL URL
is configured in Vercel (Project Settings -> Storage / Environment Variables).
========================================================================
`);
  }

  const rawEnv = {
    DATABASE_URL: rawDatabaseUrl,
    AUTH_SECRET:
      process.env.AUTH_SECRET ||
      "masar-erp-demo-secret-key-at-least-32-chars-long",
    AUTH_TRUST_HOST:
      typeof process.env.AUTH_TRUST_HOST === "boolean"
        ? process.env.AUTH_TRUST_HOST
        : process.env.AUTH_TRUST_HOST === "false" || process.env.AUTH_TRUST_HOST === "0"
          ? false
          : true,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || fallbackAppUrl,
    CRON_SECRET: process.env.CRON_SECRET || "masar_cron_secret",
    NODE_ENV: (process.env.NODE_ENV as "development" | "production" | "test") || "development",
    ADMIN_INITIAL_PASSWORD: process.env.ADMIN_INITIAL_PASSWORD,
    SEED_DEMO_DATA: process.env.SEED_DEMO_DATA,
  };

  const parsed = envSchema.safeParse(rawEnv);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ⚠️ ${i.path.join(".")}: ${i.message}`).join("\n");
    console.warn(`
========================================================================
⚠️ [Masar ERP] ENVIRONMENT VARIABLES WARNING
========================================================================
Some environment variables are missing or use default fallback values:

${issues}
========================================================================
`);
    return rawEnv as unknown as Env;
  }

  return parsed.data;
}

export const env = parseEnv();
