import { createSlidingWindowRateLimiter } from "../../shared/rate-limit.ts";

export const DEFAULT_PREDICT_LIVE_MAX = 10;
export const DEFAULT_PREDICT_LIVE_WINDOW_MS = 60_000;

const predictLiveLimiter = createSlidingWindowRateLimiter({
  maxEnvName: "AI_PREDICT_LIVE_RATE_LIMIT_MAX",
  windowEnvName: "AI_PREDICT_LIVE_RATE_LIMIT_WINDOW_MS",
  defaultMax: DEFAULT_PREDICT_LIVE_MAX,
  defaultWindowMs: DEFAULT_PREDICT_LIVE_WINDOW_MS,
  errorCode: "AI_RATE_LIMITED",
  errorMessage:
    "Terlalu banyak permintaan simulasi live. Tunggu beberapa saat sebelum mencoba kembali.",
});

/**
 * Enforces an in-memory sliding-window rate limit per actor for live simulation calls.
 */
export function enforcePredictLiveRateLimit(actorId: string): void {
  predictLiveLimiter.enforce(actorId);
}

/**
 * Clears all stored rate-limit timestamps (used in automated tests).
 */
export function clearAiRateLimit(): void {
  predictLiveLimiter.clear();
}
