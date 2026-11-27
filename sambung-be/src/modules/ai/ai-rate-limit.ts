import { ApiError } from "../../shared/api-error.ts";

export const DEFAULT_PREDICT_LIVE_MAX = 10;
export const DEFAULT_PREDICT_LIVE_WINDOW_MS = 60_000;

const predictLiveHits = new Map<string, number[]>();

function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isInteger(raw) && raw > 0 ? raw : fallback;
}

/**
 * Enforces an in-memory sliding-window rate limit per actor for live simulation calls.
 */
export function enforcePredictLiveRateLimit(actorId: string): void {
  const maxRequests = readPositiveIntEnv("AI_PREDICT_LIVE_RATE_LIMIT_MAX", DEFAULT_PREDICT_LIVE_MAX);
  const windowMs = readPositiveIntEnv(
    "AI_PREDICT_LIVE_RATE_LIMIT_WINDOW_MS",
    DEFAULT_PREDICT_LIVE_WINDOW_MS
  );
  const now = Date.now();
  const cutoff = now - windowMs;

  const existing = predictLiveHits.get(actorId) ?? [];
  const active = existing.filter((ts) => ts > cutoff);

  if (active.length >= maxRequests) {
    predictLiveHits.set(actorId, active);
    const oldest = active[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    throw new ApiError(
      429,
      "AI_RATE_LIMITED",
      "Terlalu banyak permintaan simulasi live. Tunggu beberapa saat sebelum mencoba kembali.",
      { retryAfter: String(retryAfterSec) }
    );
  }

  active.push(now);
  predictLiveHits.set(actorId, active);

  // Prune idle actors so long-running processes do not retain stale buckets.
  if (predictLiveHits.size > 500) {
    for (const [key, timestamps] of predictLiveHits) {
      if (timestamps.length === 0 || timestamps[timestamps.length - 1] <= cutoff) {
        predictLiveHits.delete(key);
      }
    }
  }
}

/**
 * Clears all stored rate-limit timestamps (used in automated tests).
 */
export function clearAiRateLimit(): void {
  predictLiveHits.clear();
}
