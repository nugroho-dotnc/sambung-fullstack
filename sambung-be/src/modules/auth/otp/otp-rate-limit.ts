import type { Request } from "express";
import { createSlidingWindowRateLimiter } from "../../../shared/rate-limit.ts";

export const DEFAULT_OTP_IP_MAX = 20;
export const DEFAULT_OTP_IP_WINDOW_MS = 10 * 60_000;

const otpIpLimiter = createSlidingWindowRateLimiter({
  maxEnvName: "OTP_IP_RATE_LIMIT_MAX",
  windowEnvName: "OTP_IP_RATE_LIMIT_WINDOW_MS",
  defaultMax: DEFAULT_OTP_IP_MAX,
  defaultWindowMs: DEFAULT_OTP_IP_WINDOW_MS,
  errorCode: "OTP_RATE_LIMITED",
  errorMessage:
    "Terlalu banyak permintaan kode verifikasi dari jaringan ini. Silakan tunggu beberapa menit sebelum mencoba kembali.",
});

/**
 * Resolves the normalized client IP address for per-IP rate limiting.
 */
export function resolveOtpClientIp(req: Request): string {
  const raw = req.ip || req.socket.remoteAddress || "unknown";
  return raw.replace(/^::ffff:/, "");
}

/**
 * Enforces an IP-level sliding-window rate limit on OTP requests to protect SMS/WhatsApp quota.
 */
export function enforceOtpIpRateLimit(req: Request): void {
  otpIpLimiter.enforce(resolveOtpClientIp(req));
}

/**
 * Clears all stored OTP rate-limit buckets (used in automated tests).
 */
export function clearOtpRateLimit(): void {
  otpIpLimiter.clear();
}
