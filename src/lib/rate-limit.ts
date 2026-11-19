interface RateLimitRecord {
  count: number;
  firstAttemptAt: number;
  lastAttemptAt: number;
}

const memoryStore = new Map<string, RateLimitRecord>();

// Cleanup stale records periodically
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupStaleRecords(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, record] of memoryStore.entries()) {
    if (now - record.lastAttemptAt > windowMs) {
      memoryStore.delete(key);
    }
  }
}

export interface RateLimitResult {
  limited: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Checks if a given key is currently rate-limited.
 * Default: 5 attempts per 15 minutes.
 */
export function checkRateLimit(
  key: string,
  limit = 5,
  windowMs = 15 * 60 * 1000
): RateLimitResult {
  cleanupStaleRecords(windowMs);

  const now = Date.now();
  const record = memoryStore.get(key);

  if (!record) {
    return { limited: false, remaining: limit, retryAfterSeconds: 0 };
  }

  // If outside the window, reset
  if (now - record.firstAttemptAt > windowMs) {
    memoryStore.delete(key);
    return { limited: false, remaining: limit, retryAfterSeconds: 0 };
  }

  if (record.count >= limit) {
    const retryAfterSeconds = Math.ceil((record.firstAttemptAt + windowMs - now) / 1000);
    return {
      limited: true,
      remaining: 0,
      retryAfterSeconds: Math.max(1, retryAfterSeconds),
    };
  }

  return {
    limited: false,
    remaining: limit - record.count,
    retryAfterSeconds: 0,
  };
}

/**
 * Increments failed attempt counter for the key.
 */
export function recordFailedAttempt(
  key: string,
  windowMs = 15 * 60 * 1000
): void {
  const now = Date.now();
  const record = memoryStore.get(key);

  if (!record || now - record.firstAttemptAt > windowMs) {
    memoryStore.set(key, {
      count: 1,
      firstAttemptAt: now,
      lastAttemptAt: now,
    });
  } else {
    record.count += 1;
    record.lastAttemptAt = now;
  }
}

/**
 * Clears failed attempt counter on successful login.
 */
export function clearRateLimit(key: string): void {
  memoryStore.delete(key);
}
