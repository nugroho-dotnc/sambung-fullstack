import { ApiError } from "../../shared/api-error.ts";

export const AI_CACHE_TTL_MS = 60_000;
export const AI_STALE_MAX_AGE_MS = 10 * 60_000;
export const AI_DEFAULT_TIMEOUT_MS = 20_000;
export const AI_INGEST_MIN_TIMEOUT_MS = 60_000;
export const AI_RETRY_DELAY_MS = 1_500;

export interface AiRequestOptions {
  timeoutMs?: number;
  retryDelayMs?: number;
}

export interface AiHealthResponse {
  status: "ready" | "starting" | "unavailable" | string;
  ready: boolean;
  modelVersion?: string;
  apiVersion?: string;
}

export interface AiHealthResult {
  httpStatus: number;
  data: AiHealthResponse;
}

export interface AiForecastQuery {
  province?: string;
  horizonWeeks?: 2 | 4;
  activeOnly?: boolean;
}

export interface AiSpatialDisparityQuery {
  province?: string;
  status?: "above" | "below" | "normal";
}

export type AiPriceBoardPeriod =
  | "4 Pekan Terakhir"
  | "8 Pekan Terakhir"
  | "12 Pekan Terakhir"
  | "Rata-rata 30 Hari";

export interface AiPriceBoardQuery {
  region?: string;
  period?: AiPriceBoardPeriod;
}

export interface AiFairPriceCalculatePayload {
  grainType: "GKP" | "GKG";
  region: string;
  ricePrice?: number;
  rendemen?: number;
  moisturePercent?: number;
  hppGovernment?: number;
}

export interface AiLivePredictOverrides {
  currentPrice?: number;
  precip28d?: number;
  stickyWeeks?: number;
  shockGrosirPct?: number;
  shockTradPct?: number;
  shockPeerPct?: number;
  shockBwh1Pct?: number;
}

export interface AiLivePredictPayload {
  province: string;
  horizonWeeks: 2 | 4;
  weekStart?: string;
  overrides?: AiLivePredictOverrides;
  forceAi?: boolean;
}

export interface AiWeeklyUpdateItem {
  province: string;
  producerPrice: number;
  wholesalePrice?: number;
  retailPrice?: number;
  precip28d?: number;
}

export interface AiWeeklyIngestPayload {
  weekStart: string;
  updates: AiWeeklyUpdateItem[];
  persist?: boolean;
}

interface CacheEntry {
  value: unknown;
  cachedAt: number;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<unknown>>();
let cacheEpoch = 0;

/**
 * Clears all cached AI read entries and detached in-flight promises.
 */
export function clearAiCache(): void {
  cache.clear();
  inFlight.clear();
  cacheEpoch += 1;
}

function readDynamicConfig(requireApiKey: boolean): {
  baseUrl: string;
  apiKey: string;
  defaultTimeoutMs: number;
} {
  const rawBase = (process.env.AI_BASE_URL ?? "").trim().replace(/\/+$/, "");
  if (!rawBase) {
    throw new ApiError(503, "AI_NOT_CONFIGURED", "Alamat layanan AI belum dikonfigurasi pada server.");
  }

  let parsedBase: URL;
  try {
    parsedBase = new URL(rawBase);
  } catch {
    throw new ApiError(503, "AI_NOT_CONFIGURED", "Konfigurasi alamat layanan AI tidak valid.");
  }
  if (!["http:", "https:"].includes(parsedBase.protocol)) {
    throw new ApiError(503, "AI_NOT_CONFIGURED", "Konfigurasi alamat layanan AI tidak valid.");
  }

  const apiKey = (process.env.AI_API_KEY ?? "").trim();
  if (requireApiKey && !apiKey) {
    throw new ApiError(503, "AI_NOT_CONFIGURED", "Kunci akses layanan AI belum dikonfigurasi pada server.");
  }

  const rawTimeout = Number(process.env.AI_TIMEOUT_MS);
  const defaultTimeoutMs =
    Number.isFinite(rawTimeout) && rawTimeout > 0 ? rawTimeout : AI_DEFAULT_TIMEOUT_MS;

  return { baseUrl: rawBase, apiKey, defaultTimeoutMs };
}

function buildPathWithQuery(
  pathname: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  if (!params) return pathname;
  const search = new URLSearchParams();
  for (const key of Object.keys(params).sort()) {
    const value = params[key];
    if (value !== undefined) {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

function compactObject<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null) {
      out[k] = v;
    }
  }
  return out;
}

function safeParseJson(text: string): { ok: true; data: unknown } | { ok: false } {
  if (!text) return { ok: false };
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

function extractErrorEnvelope(payload: unknown): {
  code?: string;
  message?: string;
  detail?: unknown;
  statusField?: string;
} {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }
  const rec = payload as Record<string, unknown>;
  const nestedError =
    rec.error && typeof rec.error === "object" && !Array.isArray(rec.error)
      ? (rec.error as Record<string, unknown>)
      : undefined;

  const code =
    typeof nestedError?.code === "string"
      ? nestedError.code
      : typeof rec.code === "string"
      ? rec.code
      : undefined;

  const detail = nestedError?.detail !== undefined ? nestedError.detail : rec.detail;

  let message: string | undefined;
  if (typeof nestedError?.message === "string" && nestedError.message) {
    message = nestedError.message;
  } else if (typeof rec.message === "string" && rec.message) {
    message = rec.message;
  } else if (typeof detail === "string" && detail) {
    message = detail;
  }

  const statusField = typeof rec.status === "string" ? rec.status : undefined;
  return { code, message, detail, statusField };
}

function isTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const errObj = error as { name?: unknown; cause?: unknown };
  if (errObj.name === "TimeoutError" || errObj.name === "AbortError") {
    return true;
  }
  if (errObj.cause && typeof errObj.cause === "object") {
    const causeName = (errObj.cause as { name?: unknown }).name;
    if (causeName === "TimeoutError" || causeName === "AbortError") {
      return true;
    }
  }
  return false;
}

function logUpstreamAttempt(
  method: string,
  pathname: string,
  status: number | string,
  latencyMs: number
): void {
  console.info(`[AI Client] ${method} ${pathname} status=${status} latencyMs=${latencyMs}`);
}

function mapUpstreamErrorResponse(
  status: number,
  bodyText: string,
  retryAfterHeader: string | null
): ApiError {
  const parsed = safeParseJson(bodyText);
  const env = parsed.ok ? extractErrorEnvelope(parsed.data) : {};

  if (status === 401) {
    console.warn("[AI Client] Autentikasi X-API-Key ke layanan AI ditolak (401). Periksa AI_API_KEY.");
    return new ApiError(
      503,
      "AI_AUTH_ERROR",
      "Konfigurasi autentikasi layanan AI pada server belum sesuai."
    );
  }

  if (status === 503) {
    if (env.code === "SERVICE_STARTING" || env.statusField === "starting") {
      return new ApiError(
        503,
        "AI_SERVICE_STARTING",
        "Layanan AI sedang memuat model. Silakan tunggu beberapa saat dan coba kembali."
      );
    }
    return new ApiError(
      503,
      "AI_SERVICE_UNAVAILABLE",
      "Layanan AI belum tersedia saat ini. Silakan coba kembali beberapa saat lagi."
    );
  }

  if (status >= 500) {
    return new ApiError(
      503,
      "AI_SERVICE_UNAVAILABLE",
      "Layanan AI sedang mengalami gangguan sementara. Silakan coba kembali beberapa saat lagi."
    );
  }

  if (status === 400) {
    return new ApiError(
      400,
      env.code || "AI_BAD_REQUEST",
      env.message || "Permintaan ke layanan AI tidak valid."
    );
  }

  if (status === 404) {
    return new ApiError(
      404,
      env.code || "AI_NOT_FOUND",
      env.message || "Data yang diminta tidak ditemukan pada layanan AI."
    );
  }

  if (status === 422) {
    return new ApiError(
      422,
      env.code || "AI_VALIDATION_ERROR",
      env.message || "Parameter input layanan AI tidak valid.",
      env.detail !== undefined ? { detail: env.detail } : undefined
    );
  }

  if (status === 429) {
    const retryAfter = retryAfterHeader?.trim() || undefined;
    return new ApiError(
      429,
      env.code || "AI_RATE_LIMITED",
      env.message || "Layanan AI sedang menerima terlalu banyak permintaan. Coba beberapa saat lagi.",
      retryAfter ? { retryAfter } : undefined
    );
  }

  return new ApiError(
    502,
    "AI_UNEXPECTED_RESPONSE",
    "Layanan AI memberikan respons status yang tidak diharapkan."
  );
}

async function performUpstreamRequest(params: {
  baseUrl: string;
  apiKey: string;
  method: "GET" | "POST";
  pathname: string;
  pathWithQuery: string;
  skipAuth?: boolean;
  body?: Record<string, unknown>;
  timeoutMs: number;
}): Promise<{ status: number; headers: Headers; bodyText: string }> {
  const startedAt = Date.now();
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (!params.skipAuth) {
    headers["X-API-Key"] = params.apiKey;
  }
  if (params.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  let response: Response;
  try {
    response = await fetch(`${params.baseUrl}${params.pathWithQuery}`, {
      method: params.method,
      headers,
      body: params.body !== undefined ? JSON.stringify(params.body) : undefined,
      signal: AbortSignal.timeout(params.timeoutMs),
    });
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    if (isTimeoutError(error)) {
      logUpstreamAttempt(params.method, params.pathname, "TIMEOUT", latencyMs);
      throw new ApiError(
        503,
        "AI_SERVICE_STARTING",
        "Layanan AI membutuhkan waktu lebih lama saat memulai model. Silakan coba kembali."
      );
    }
    logUpstreamAttempt(params.method, params.pathname, "NETWORK_ERROR", latencyMs);
    throw new ApiError(
      503,
      "AI_SERVICE_UNAVAILABLE",
      "Layanan AI sedang tidak dapat dihubungi. Silakan coba kembali beberapa saat lagi."
    );
  }

  const bodyText = await response.text();
  logUpstreamAttempt(params.method, params.pathname, response.status, Date.now() - startedAt);
  return { status: response.status, headers: response.headers, bodyText };
}

function resolveTimeoutMs(defaultTimeoutMs: number, options?: AiRequestOptions, minMs = 0): number {
  if (options?.timeoutMs !== undefined && Number.isFinite(options.timeoutMs) && options.timeoutMs > 0) {
    return options.timeoutMs;
  }
  return Math.max(defaultTimeoutMs, minMs);
}

async function sleep(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isStaleEligibleError(error: unknown): error is ApiError {
  if (!(error instanceof ApiError)) return false;
  if (error.code === "AI_NOT_CONFIGURED") return false;
  return error.status === 503 || error.status === 502 || error.status === 429;
}

async function requestCachedGet<T>(
  pathname: string,
  query?: Record<string, string | number | boolean | undefined>,
  options?: AiRequestOptions
): Promise<T> {
  const { baseUrl, apiKey, defaultTimeoutMs } = readDynamicConfig(true);
  const timeoutMs = resolveTimeoutMs(defaultTimeoutMs, options);
  const retryDelayMs =
    options?.retryDelayMs !== undefined && options.retryDelayMs >= 0
      ? options.retryDelayMs
      : AI_RETRY_DELAY_MS;
  const pathWithQuery = buildPathWithQuery(pathname, query);
  const key = `${baseUrl}|${pathWithQuery}`;
  const now = Date.now();

  const cached = cache.get(key);
  if (cached && now < cached.expiresAt) {
    return structuredClone(cached.value) as T;
  }

  const existingFlight = inFlight.get(key);
  if (existingFlight) {
    const shared = await existingFlight;
    return structuredClone(shared) as T;
  }

  const requestEpoch = cacheEpoch;

  const flightPromise = (async (): Promise<unknown> => {
    const executeOnce = async (): Promise<unknown> => {
      const res = await performUpstreamRequest({
        baseUrl,
        apiKey,
        method: "GET",
        pathname,
        pathWithQuery,
        timeoutMs,
      });

      if (res.status < 200 || res.status >= 300) {
        throw mapUpstreamErrorResponse(res.status, res.bodyText, res.headers.get("retry-after"));
      }

      const parsed = safeParseJson(res.bodyText);
      if (!parsed.ok) {
        throw new ApiError(
          502,
          "AI_UNEXPECTED_RESPONSE",
          "Respons layanan AI tidak berformat JSON yang valid."
        );
      }
      return parsed.data;
    };

    try {
      let data: unknown;
      try {
        data = await executeOnce();
      } catch (firstErr) {
        if (firstErr instanceof ApiError && firstErr.code === "AI_SERVICE_STARTING") {
          await sleep(retryDelayMs);
          data = await executeOnce();
        } else {
          throw firstErr;
        }
      }

      const doneAt = Date.now();
      if (cacheEpoch === requestEpoch) {
        cache.set(key, {
          value: structuredClone(data),
          cachedAt: doneAt,
          expiresAt: doneAt + AI_CACHE_TTL_MS,
        });
      }
      return data;
    } catch (err) {
      const stale = cache.get(key);
      if (cacheEpoch === requestEpoch && stale && isStaleEligibleError(err)) {
        const ageMs = Date.now() - stale.cachedAt;
        if (ageMs <= AI_STALE_MAX_AGE_MS) {
          console.warn(
            `[AI Client] Menyajikan cache stale untuk GET ${pathname} (umur=${Math.round(
              ageMs / 1000
            )}s, pemicu=${err.code}).`
          );
          return structuredClone(stale.value);
        }
        cache.delete(key);
      }
      throw err;
    }
  })();

  inFlight.set(key, flightPromise);
  try {
    const result = await flightPromise;
    return structuredClone(result) as T;
  } finally {
    if (inFlight.get(key) === flightPromise) {
      inFlight.delete(key);
    }
  }
}

async function requestUncachedPost<T>(
  pathname: string,
  body: Record<string, unknown>,
  options?: AiRequestOptions,
  minTimeoutMs = 0
): Promise<T> {
  const { baseUrl, apiKey, defaultTimeoutMs } = readDynamicConfig(true);
  const timeoutMs = resolveTimeoutMs(defaultTimeoutMs, options, minTimeoutMs);

  const res = await performUpstreamRequest({
    baseUrl,
    apiKey,
    method: "POST",
    pathname,
    pathWithQuery: pathname,
    body,
    timeoutMs,
  });

  if (res.status < 200 || res.status >= 300) {
    throw mapUpstreamErrorResponse(res.status, res.bodyText, res.headers.get("retry-after"));
  }

  const parsed = safeParseJson(res.bodyText);
  if (!parsed.ok) {
    throw new ApiError(
      502,
      "AI_UNEXPECTED_RESPONSE",
      "Respons layanan AI tidak berformat JSON yang valid."
    );
  }
  return parsed.data as T;
}

/**
 * Checks public readiness on GET /health without X-API-Key, cache, or retry.
 */
export async function fetchAiHealth(options?: AiRequestOptions): Promise<AiHealthResult> {
  const { baseUrl, defaultTimeoutMs } = readDynamicConfig(false);
  const timeoutMs = resolveTimeoutMs(defaultTimeoutMs, options);

  const res = await performUpstreamRequest({
    baseUrl,
    apiKey: "",
    method: "GET",
    pathname: "/health",
    pathWithQuery: "/health",
    skipAuth: true,
    timeoutMs,
  });

  const parsed = safeParseJson(res.bodyText);
  if (res.status >= 200 && res.status < 300) {
    if (!parsed.ok || typeof parsed.data !== "object" || parsed.data === null || Array.isArray(parsed.data)) {
      throw new ApiError(
        502,
        "AI_UNEXPECTED_RESPONSE",
        "Respons /health layanan AI tidak berformat JSON yang valid."
      );
    }
    return {
      httpStatus: res.status,
      data: parsed.data as AiHealthResponse,
    };
  }

  if (res.status === 503) {
    const env = parsed.ok ? extractErrorEnvelope(parsed.data) : {};
    const status = env.statusField === "unavailable" ? "unavailable" : "starting";
    return {
      httpStatus: 503,
      data: {
        status,
        ready: false,
        modelVersion: "sambung-predict-v1",
        apiVersion: "v1",
      },
    };
  }

  throw mapUpstreamErrorResponse(res.status, res.bodyText, res.headers.get("retry-after"));
}

/**
 * Fetches 2w/4w producer rice forecasts from GET /api/v1/forecasts (60s cached).
 */
export async function fetchAiForecasts<T = unknown>(
  query?: AiForecastQuery,
  options?: AiRequestOptions
): Promise<T> {
  return requestCachedGet<T>(
    "/api/v1/forecasts",
    query
      ? {
          province: query.province,
          horizonWeeks: query.horizonWeeks,
          activeOnly: query.activeOnly,
        }
      : undefined,
    options
  );
}

/**
 * Fetches 34-province traditional market disparity & TreeSHAP drivers (60s cached).
 */
export async function fetchAiSpatialDisparity<T = unknown>(
  query?: AiSpatialDisparityQuery,
  options?: AiRequestOptions
): Promise<T> {
  return requestCachedGet<T>(
    "/api/v1/spatial-disparity",
    query
      ? {
          province: query.province,
          status: query.status,
        }
      : undefined,
    options
  );
}

/**
 * Fetches authentic 4-tier Beras Medium I supply-chain prices & trends (60s cached).
 */
export async function fetchAiPriceBoard<T = unknown>(
  query?: AiPriceBoardQuery,
  options?: AiRequestOptions
): Promise<T> {
  return requestCachedGet<T>(
    "/api/v1/price-board",
    query
      ? {
          region: query.region,
          period: query.period,
        }
      : undefined,
    options
  );
}

/**
 * Fetches deterministic SKGB/Bapanas/HPP 2026 fair-price parameters (60s cached).
 */
export async function fetchAiFairPriceParams<T = unknown>(options?: AiRequestOptions): Promise<T> {
  return requestCachedGet<T>("/api/v1/fair-price/params", undefined, options);
}

/**
 * Fetches walk-forward model audit & quarantine report from GET /api/v1/model-evaluation (60s cached).
 */
export async function fetchAiModelEvaluation<T = unknown>(options?: AiRequestOptions): Promise<T> {
  return requestCachedGet<T>("/api/v1/model-evaluation", undefined, options);
}

/**
 * Computes live deterministic fair-price bounds via POST /api/v1/fair-price/calculate (never cached/retried).
 */
export async function calculateAiFairPrice<T = unknown>(
  payload: AiFairPriceCalculatePayload,
  options?: AiRequestOptions
): Promise<T> {
  return requestUncachedPost<T>(
    "/api/v1/fair-price/calculate",
    compactObject({ ...payload }),
    options
  );
}

/**
 * Runs stateless What-If live prediction via POST /api/v1/predict/live (never cached/retried).
 */
export async function predictAiLive<T = unknown>(
  payload: AiLivePredictPayload,
  options?: AiRequestOptions
): Promise<T> {
  const cleanOverrides = payload.overrides ? compactObject({ ...payload.overrides }) : undefined;
  const body = compactObject({
    province: payload.province,
    horizonWeeks: payload.horizonWeeks,
    weekStart: payload.weekStart,
    overrides: cleanOverrides && Object.keys(cleanOverrides).length > 0 ? cleanOverrides : undefined,
    forceAi: payload.forceAi,
  });
  return requestUncachedPost<T>("/api/v1/predict/live", body, options);
}

/**
 * Sends weekly market updates via POST /api/v1/admin/ingest (never cached/retried; clears cache on success).
 */
export async function ingestAiWeeklyPrices<T = unknown>(
  payload: AiWeeklyIngestPayload,
  options?: AiRequestOptions
): Promise<T> {
  const body = compactObject({
    weekStart: payload.weekStart,
    persist: payload.persist,
    updates: payload.updates.map((row) => compactObject({ ...row })),
  });
  const result = await requestUncachedPost<T>(
    "/api/v1/admin/ingest",
    body,
    options,
    AI_INGEST_MIN_TIMEOUT_MS
  );
  clearAiCache();
  return result;
}

/**
 * Best-effort non-blocking warm-up at backend startup; logs errors without throwing.
 */
export async function warmUpAi(options?: AiRequestOptions): Promise<void> {
  try {
    const health = await fetchAiHealth(options);
    if (!health.data.ready) {
      console.warn(
        `[AI WarmUp] Layanan AI belum siap (status=${health.data.status}, http=${health.httpStatus}).`
      );
      return;
    }

    const targets: Array<{ name: string; run: () => Promise<unknown> }> = [
      { name: "forecasts", run: () => fetchAiForecasts(undefined, options) },
      { name: "spatial-disparity", run: () => fetchAiSpatialDisparity(undefined, options) },
      { name: "price-board", run: () => fetchAiPriceBoard(undefined, options) },
      { name: "fair-price/params", run: () => fetchAiFairPriceParams(options) },
      { name: "model-evaluation", run: () => fetchAiModelEvaluation(options) },
    ];

    const settled = await Promise.allSettled(targets.map((t) => t.run()));
    settled.forEach((outcome, index) => {
      if (outcome.status === "rejected") {
        const err = outcome.reason;
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[AI WarmUp] Gagal memuat ${targets[index].name}: ${msg}`);
      }
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`[AI WarmUp] Pemeriksaan awal layanan AI gagal: ${msg}`);
  }
}
