import { ApiError } from "./api-error.ts";

export interface SlidingWindowOptions {
  maxEnvName: string;
  windowEnvName: string;
  defaultMax: number;
  defaultWindowMs: number;
  errorCode: string;
  errorMessage: string;
}

function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isInteger(raw) && raw > 0 ? raw : fallback;
}

/**
 * Creates an in-memory sliding-window rate limiter keyed by caller identifier.
 */
export function createSlidingWindowRateLimiter(options: SlidingWindowOptions) {
  const buckets = new Map<string, number[]>();

  function enforce(key: string): void {
    const maxRequests = readPositiveIntEnv(options.maxEnvName, options.defaultMax);
    const windowMs = readPositiveIntEnv(options.windowEnvName, options.defaultWindowMs);
    const now = Date.now();
    const cutoff = now - windowMs;

    const existing = buckets.get(key) ?? [];
    const active = existing.filter((ts) => ts > cutoff);

    if (active.length >= maxRequests) {
      buckets.set(key, active);
      const oldest = active[0] ?? now;
      const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
      throw new ApiError(429, options.errorCode, options.errorMessage, {
        retryAfter: String(retryAfterSec),
      });
    }

    active.push(now);
    buckets.set(key, active);

    // Prune stale buckets so long-running server processes stay bounded in memory.
    if (buckets.size > 500) {
      for (const [bucketKey, timestamps] of buckets) {
        if (timestamps.length === 0 || timestamps[timestamps.length - 1] <= cutoff) {
          buckets.delete(bucketKey);
        }
      }
    }
  }

  function clear(): void {
    buckets.clear();
  }

  return { enforce, clear };
}
