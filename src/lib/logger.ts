import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";
const logLevel = process.env.LOG_LEVEL || (isProduction ? "info" : "debug");

export const logger = pino({
  level: logLevel,
  base: {
    app: "masar-erp",
    env: process.env.NODE_ENV || "development",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      },
});

/**
 * Creates a scoped child logger with a module identifier.
 * Example: const log = createChildLogger("accounting.posting");
 */
export function createChildLogger(module: string, bindings: Record<string, unknown> = {}) {
  return logger.child({ module, ...bindings });
}

export interface ErrorReportContext {
  userId?: string | null;
  module?: string;
  action?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Centralized error reporting hook.
 * Logs structured error payload and dispatches to external monitoring (Sentry / webhook) if configured.
 */
export async function reportError(
  error: unknown,
  context: ErrorReportContext = {}
): Promise<void> {
  const err = error instanceof Error ? error : new Error(String(error));

  const errorPayload = {
    name: err.name,
    message: err.message,
    stack: err.stack,
    context,
    timestamp: new Date().toISOString(),
  };

  logger.error(errorPayload, `[ErrorReport] ${err.name}: ${err.message}`);

  // Optional external notification hook (e.g. Sentry or Alert Webhook)
  const webhookUrl = process.env.ERROR_WEBHOOK_URL;
  if (webhookUrl && isProduction) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `🚨 [Masar ERP Error] ${err.name}: ${err.message}`,
          details: errorPayload,
        }),
      });
    } catch (dispatchErr) {
      logger.warn(
        { err: dispatchErr },
        "Failed to dispatch error report to external webhook"
      );
    }
  }
}
