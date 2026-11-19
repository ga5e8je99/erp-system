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
    .url("NEXT_PUBLIC_APP_URL must be a valid URL (e.g. http://localhost:3000 or https://erp.example.com)")
    .default("http://localhost:3000"),

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

  const rawEnv = {
    DATABASE_URL:
      process.env.DATABASE_URL ||
      (isBuildOrTest
        ? "postgresql://postgres:postgres@localhost:5432/masar_erp?schema=public"
        : undefined),
    AUTH_SECRET:
      process.env.AUTH_SECRET ||
      (isBuildOrTest
        ? "test-secret-key-at-least-32-chars-long-for-testing"
        : undefined),
    AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    CRON_SECRET: process.env.CRON_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    ADMIN_INITIAL_PASSWORD: process.env.ADMIN_INITIAL_PASSWORD,
    SEED_DEMO_DATA: process.env.SEED_DEMO_DATA,
  };

  const parsed = envSchema.safeParse(rawEnv);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ❌ ${i.path.join(".")}: ${i.message}`).join("\n");
    const errorMessage = `
========================================================================
🚨 FATAL STARTUP CONFIGURATION ERROR: INVALID ENVIRONMENT VARIABLES
========================================================================
The application failed to start because one or more required environment
variables are missing or malformed:

${issues}

👉 Action Required:
   - For local development: Verify your .env file has all required keys.
   - For production / Docker: Set environment variables in docker-compose.yml or your cloud hosting panel.
   - Refer to .env.example for template values.
========================================================================
`;
    // Fail fast with clear diagnostic message
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  return parsed.data;
}

export const env = parseEnv();
