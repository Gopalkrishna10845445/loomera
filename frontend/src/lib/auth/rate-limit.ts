interface RateLimitRecord {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil: number;
}

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minute lockout

const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * Periodically purge stale records (older than 30 mins) to prevent memory growth.
 */
function cleanupStore() {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.firstAttemptAt + WINDOW_MS && now > record.lockedUntil) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Checks if a key (e.g. IP or email) is currently rate limited.
 */
export function checkRateLimit(key: string): {
  isLimited: boolean;
  retryAfterSeconds?: number;
} {
  const record = rateLimitStore.get(key);
  if (!record) {
    return { isLimited: false };
  }

  const now = Date.now();

  // If currently locked out
  if (record.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { isLimited: true, retryAfterSeconds };
  }

  // If window has passed, reset
  if (now > record.firstAttemptAt + WINDOW_MS) {
    rateLimitStore.delete(key);
    return { isLimited: false };
  }

  return { isLimited: false };
}

/**
 * Records a failed attempt for the given key.
 * Escalates to a lockout if attempts exceed MAX_ATTEMPTS.
 */
export function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.firstAttemptAt + WINDOW_MS) {
    rateLimitStore.set(key, {
      attempts: 1,
      firstAttemptAt: now,
      lockedUntil: 0,
    });
    return;
  }

  record.attempts += 1;
  if (record.attempts >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_MS;
  }

  // Periodic cleanup if store grows
  if (rateLimitStore.size > 1000) {
    cleanupStore();
  }
}

/**
 * Resets rate limit for a key upon successful authentication.
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}
