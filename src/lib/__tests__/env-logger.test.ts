import { describe, it, expect } from "vitest";
import { env } from "../env";
import { logger, createChildLogger, reportError } from "../logger";

describe("Environment & Logger Utilities", () => {
  it("validates core environment variables successfully", () => {
    expect(env.DATABASE_URL).toBeDefined();
    expect(env.DATABASE_URL).toMatch(/^postgres(ql)?:\/\//);
    expect(env.AUTH_SECRET).toBeDefined();
    expect(env.AUTH_SECRET.length).toBeGreaterThanOrEqual(16);
    expect(env.NEXT_PUBLIC_APP_URL).toBeDefined();
  });

  it("provides a root structured logger instance", () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.error).toBe("function");
  });

  it("creates structured child loggers with module context", () => {
    const childLog = createChildLogger("test.module");
    expect(childLog).toBeDefined();
    expect(typeof childLog.info).toBe("function");
    expect(typeof childLog.error).toBe("function");
  });

  it("handles reportError gracefully without throwing", async () => {
    const testError = new Error("Sample synthetic test error");
    await expect(
      reportError(testError, { module: "test", action: "unit-test" })
    ).resolves.toBeUndefined();
  });
});
