/**
 * Simple in-memory rate limiter
 * Works per serverless instance — good enough for low-to-mid traffic
 * For high traffic, swap to Redis (Upstash)
 */

type RateEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateEntry>();

// Clean up expired entries every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) {
        store.delete(key);
      }
    }
  },
  5 * 60 * 1000,
);

/**
 * Check if a request is rate-limited
 * @param key - unique identifier (usually IP)
 * @param maxRequests - max requests allowed in the window
 * @param windowMs - time window in milliseconds
 * @returns { limited, remaining, resetIn }
 */
export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): { limited: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, remaining: maxRequests - 1, resetIn: windowMs };
  }

  entry.count++;

  if (entry.count > maxRequests) {
    return {
      limited: true,
      remaining: 0,
      resetIn: entry.resetAt - now,
    };
  }

  return {
    limited: false,
    remaining: maxRequests - entry.count,
    resetIn: entry.resetAt - now,
  };
}

/**
 * Get client IP from request headers
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
