import { createHash, timingSafeEqual } from "node:crypto";
import { ApiError } from "../../shared/api-error.ts";

export const DEFAULT_MIDTRANS_SNAP_BASE_URL = "https://app.sandbox.midtrans.com";
export const DEFAULT_MIDTRANS_API_BASE_URL = "https://api.sandbox.midtrans.com";
export const DEFAULT_MIDTRANS_TIMEOUT_MS = 15_000;

export type PaymentStatusValue =
  | "pending"
  | "paid"
  | "failed"
  | "expired"
  | "cancelled"
  | "refunded";

export type EscrowStatusValue = "unpaid" | "held" | "released" | "refunded";

export interface MidtransConfig {
  serverKey: string;
  clientKey: string;
  signatureSecretKey: string;
  snapBaseUrl: string;
  apiBaseUrl: string;
  snapScriptUrl: string;
  timeoutMs: number;
}

export interface SnapItemDetail {
  id: string;
  price: number;
  quantity: number;
  name: string;
}

export interface CreateSnapTransactionInput {
  orderId: string;
  grossAmount: number;
  items: SnapItemDetail[];
  customer: {
    firstName: string;
    phone: string;
    email?: string | null;
  };
  expiry?: {
    startTime: string;
    unit: "minutes" | "hours" | "days";
    duration: number;
  };
}

export interface SnapTransactionResult {
  token: string;
  redirectUrl: string;
}

export type MidtransStatusFetchResult =
  | { found: false }
  | { found: true; data: Record<string, unknown> };

function assertSandboxOrLocalUrl(rawUrl: string, kind: "snap" | "api"): string {
  const cleaned = rawUrl.trim().replace(/\/+$/, "");
  let parsed: URL;
  try {
    parsed = new URL(cleaned);
  } catch {
    throw new ApiError(
      503,
      "PAYMENT_INVALID_CONFIG",
      "Konfigurasi alamat layanan Midtrans tidak valid."
    );
  }

  const host = parsed.hostname.toLowerCase();
  const isLocalMock =
    (host === "127.0.0.1" || host === "localhost") &&
    (parsed.protocol === "http:" || parsed.protocol === "https:");
  const expectedSandboxHost =
    kind === "snap" ? "app.sandbox.midtrans.com" : "api.sandbox.midtrans.com";
  const isOfficialSandbox = parsed.protocol === "https:" && host === expectedSandboxHost;

  if (!isLocalMock && !isOfficialSandbox) {
    throw new ApiError(
      503,
      "PAYMENT_INVALID_CONFIG",
      "Konfigurasi alamat Midtrans hanya diperbolehkan untuk lingkungan Sandbox."
    );
  }
  return cleaned;
}

/**
 * Checks whether Midtrans Sandbox credentials are present in the active environment.
 */
export function isMidtransConfigured(): boolean {
  const serverKey = (process.env.MIDTRANS_SERVER_KEY ?? "").trim();
  const clientKey = (process.env.MIDTRANS_CLIENT_KEY ?? "").trim();
  return serverKey.length > 0 && clientKey.length > 0;
}

/**
 * Reads and validates Midtrans Sandbox credentials and host-locked URLs dynamically.
 */
export function readMidtransConfig(): MidtransConfig {
  const serverKey = (process.env.MIDTRANS_SERVER_KEY ?? "").trim();
  const clientKey = (process.env.MIDTRANS_CLIENT_KEY ?? "").trim();
  if (!serverKey || !clientKey) {
    throw new ApiError(
      503,
      "PAYMENT_NOT_CONFIGURED",
      "Layanan pembayaran Midtrans Sandbox belum dikonfigurasi pada server."
    );
  }

  const signatureSecretKey =
    (process.env.MIDTRANS_SIGNATURE_SECRET_KEY ?? "").trim() || serverKey;
  const rawSnapUrl = (process.env.MIDTRANS_SNAP_BASE_URL ?? "").trim() || DEFAULT_MIDTRANS_SNAP_BASE_URL;
  const rawApiUrl = (process.env.MIDTRANS_API_BASE_URL ?? "").trim() || DEFAULT_MIDTRANS_API_BASE_URL;

  const snapBaseUrl = assertSandboxOrLocalUrl(rawSnapUrl, "snap");
  const apiBaseUrl = assertSandboxOrLocalUrl(rawApiUrl, "api");

  const rawTimeout = Number(process.env.MIDTRANS_TIMEOUT_MS);
  const timeoutMs =
    Number.isFinite(rawTimeout) && rawTimeout >= 1000 && rawTimeout <= 120_000
      ? rawTimeout
      : DEFAULT_MIDTRANS_TIMEOUT_MS;

  return {
    serverKey,
    clientKey,
    signatureSecretKey,
    snapBaseUrl,
    apiBaseUrl,
    snapScriptUrl: `${snapBaseUrl}/snap/snap.js`,
    timeoutMs,
  };
}

/**
 * Reads the HMAC/SHA-512 webhook verification secret without requiring Snap URLs when verifying webhooks.
 */
export function readWebhookVerificationSecret(): string {
  const explicit = (process.env.MIDTRANS_SIGNATURE_SECRET_KEY ?? "").trim();
  if (explicit) return explicit;
  const serverKey = (process.env.MIDTRANS_SERVER_KEY ?? "").trim();
  if (serverKey) return serverKey;
  throw new ApiError(
    503,
    "PAYMENT_NOT_CONFIGURED",
    "Kunci verifikasi webhook Midtrans belum dikonfigurasi pada server."
  );
}

function buildBasicAuthHeader(serverKey: string): string {
  return `Basic ${Buffer.from(`${serverKey}:`, "utf8").toString("base64")}`;
}

function safeParseJson(text: string): { ok: true; data: unknown } | { ok: false } {
  if (!text) return { ok: false };
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Formats a Date into Midtrans expiry timestamp string ("YYYY-MM-DD HH:mm:ss +0700").
 */
export function formatMidtransStartTime(date: Date): string {
  const wib = new Date(date.getTime() + 7 * 3600_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${wib.getUTCFullYear()}-${pad(wib.getUTCMonth() + 1)}-${pad(wib.getUTCDate())} ` +
    `${pad(wib.getUTCHours())}:${pad(wib.getUTCMinutes())}:${pad(wib.getUTCSeconds())} +0700`
  );
}

/**
 * Creates a Midtrans Snap transaction token and hosted redirect URL.
 */
export async function createSnapTransaction(
  config: MidtransConfig,
  input: CreateSnapTransactionInput
): Promise<SnapTransactionResult> {
  const customerDetails: Record<string, string> = {
    first_name: input.customer.firstName.trim().slice(0, 50) || "Pembeli",
    phone: input.customer.phone.trim(),
  };
  const trimmedEmail = input.customer.email?.trim();
  if (trimmedEmail) {
    customerDetails.email = trimmedEmail;
  }

  const body: Record<string, unknown> = {
    transaction_details: {
      order_id: input.orderId,
      gross_amount: input.grossAmount,
    },
    item_details: input.items.map((item) => ({
      id: item.id.slice(0, 50),
      price: item.price,
      quantity: item.quantity,
      name: item.name.slice(0, 50),
    })),
    customer_details: customerDetails,
  };

  if (input.expiry) {
    body.expiry = {
      start_time: input.expiry.startTime,
      unit: input.expiry.unit,
      duration: input.expiry.duration,
    };
  }

  let response: Response;
  try {
    response = await fetch(`${config.snapBaseUrl}/snap/v1/transactions`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: buildBasicAuthHeader(config.serverKey),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(config.timeoutMs),
    });
  } catch {
    throw new ApiError(
      503,
      "PAYMENT_GATEWAY_UNAVAILABLE",
      "Layanan pembayaran Midtrans Sandbox sedang tidak dapat dihubungi. Silakan coba beberapa saat lagi."
    );
  }

  const rawText = await response.text();
  const parsed = safeParseJson(rawText);
  if (!response.ok || !parsed.ok || !isPlainRecord(parsed.data)) {
    const gatewayMessages =
      parsed.ok && isPlainRecord(parsed.data) && Array.isArray(parsed.data.error_messages)
        ? parsed.data.error_messages.filter((m): m is string => typeof m === "string").join("; ")
        : "";
    console.warn(`[Midtrans Client] Snap create failed status=${response.status}${gatewayMessages ? ` msg=${gatewayMessages}` : ""}`);
    throw new ApiError(
      502,
      "PAYMENT_GATEWAY_ERROR",
      "Gagal membuat sesi pembayaran pada Midtrans Sandbox. Silakan coba kembali."
    );
  }

  const token = typeof parsed.data.token === "string" ? parsed.data.token : "";
  const redirectUrl = typeof parsed.data.redirect_url === "string" ? parsed.data.redirect_url : "";
  if (!token || !redirectUrl) {
    throw new ApiError(
      502,
      "PAYMENT_GATEWAY_ERROR",
      "Respons sesi pembayaran Midtrans tidak lengkap."
    );
  }

  return { token, redirectUrl };
}

/**
 * Fetches authoritative transaction status from Midtrans Sandbox Core API (/v2/{orderId}/status).
 * Treats Midtrans HTTP 404 or status_code "404" as unselected Snap payment method ({ found: false }).
 */
export async function fetchTransactionStatus(
  config: MidtransConfig,
  orderId: string
): Promise<MidtransStatusFetchResult> {
  let response: Response;
  try {
    response = await fetch(`${config.apiBaseUrl}/v2/${encodeURIComponent(orderId)}/status`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: buildBasicAuthHeader(config.serverKey),
      },
      signal: AbortSignal.timeout(config.timeoutMs),
    });
  } catch {
    throw new ApiError(
      503,
      "PAYMENT_GATEWAY_UNAVAILABLE",
      "Gagal memeriksa status pembayaran ke Midtrans Sandbox."
    );
  }

  if (response.status === 404) {
    return { found: false };
  }

  const rawText = await response.text();
  const parsed = safeParseJson(rawText);
  if (!parsed.ok || !isPlainRecord(parsed.data)) {
    throw new ApiError(
      502,
      "PAYMENT_GATEWAY_ERROR",
      "Respons status pembayaran Midtrans tidak valid."
    );
  }

  if (String(parsed.data.status_code ?? "") === "404") {
    return { found: false };
  }

  if (!response.ok) {
    console.warn(`[Midtrans Client] Status fetch failed status=${response.status}`);
    throw new ApiError(
      502,
      "PAYMENT_GATEWAY_ERROR",
      "Layanan Midtrans Sandbox menolak permintaan cek status pembayaran."
    );
  }

  return { found: true, data: parsed.data };
}

/**
 * Cancels an existing pending Midtrans transaction when the buyer switches payment methods.
 */
export async function cancelTransaction(config: MidtransConfig, orderId: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${config.apiBaseUrl}/v2/${encodeURIComponent(orderId)}/cancel`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: buildBasicAuthHeader(config.serverKey),
      },
      signal: AbortSignal.timeout(config.timeoutMs),
    });
  } catch {
    throw new ApiError(
      503,
      "PAYMENT_GATEWAY_UNAVAILABLE",
      "Gagal membatalkan sesi pembayaran sebelumnya di Midtrans Sandbox."
    );
  }

  if (response.ok || response.status === 404 || response.status === 412) {
    return;
  }

  console.warn(`[Midtrans Client] Cancel failed status=${response.status}`);
  throw new ApiError(
    502,
    "PAYMENT_GATEWAY_ERROR",
    "Tidak dapat membatalkan transaksi Midtrans yang sedang menunggu pembayaran."
  );
}

/**
 * Verifies Midtrans webhook SHA-512 signature_key with constant-time comparison.
 */
export function verifyWebhookSignature(input: {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
}): boolean {
  const secret = readWebhookVerificationSecret();
  const normalizedIncoming = input.signature_key.trim().toLowerCase();
  if (!/^[a-f0-9]{128}$/.test(normalizedIncoming)) {
    return false;
  }

  const expectedHex = createHash("sha512")
    .update(`${input.order_id}${input.status_code}${input.gross_amount}${secret}`, "utf8")
    .digest("hex");

  const expectedBuf = Buffer.from(expectedHex, "hex");
  const incomingBuf = Buffer.from(normalizedIncoming, "hex");
  if (expectedBuf.length !== incomingBuf.length) {
    return false;
  }
  return timingSafeEqual(expectedBuf, incomingBuf);
}

/**
 * Maps Midtrans transaction_status and fraud_status deterministically into internal states.
 */
export function mapMidtransStatus(
  transactionStatus: string,
  fraudStatus?: string | null
): { status: PaymentStatusValue; escrowStatus: EscrowStatusValue } {
  const tx = transactionStatus.trim().toLowerCase();
  const fraud = (fraudStatus ?? "").trim().toLowerCase();

  if (tx === "settlement") {
    return { status: "paid", escrowStatus: "held" };
  }
  if (tx === "capture") {
    if (fraud === "deny") {
      return { status: "failed", escrowStatus: "unpaid" };
    }
    if (fraud === "challenge") {
      return { status: "pending", escrowStatus: "unpaid" };
    }
    return { status: "paid", escrowStatus: "held" };
  }
  if (tx === "pending") {
    return { status: "pending", escrowStatus: "unpaid" };
  }
  if (tx === "expire") {
    return { status: "expired", escrowStatus: "unpaid" };
  }
  if (tx === "cancel") {
    return { status: "cancelled", escrowStatus: "unpaid" };
  }
  if (tx === "deny" || tx === "failure") {
    return { status: "failed", escrowStatus: "unpaid" };
  }
  if (tx === "refund" || tx === "partial_refund") {
    return { status: "refunded", escrowStatus: "refunded" };
  }
  return { status: "pending", escrowStatus: "unpaid" };
}

/**
 * Extracts normalized payment channel and payment reference metadata from Midtrans payloads.
 */
export function extractPaymentMetadata(payload: Record<string, unknown>): {
  paymentType: string | null;
  paymentChannel: string | null;
  paymentReference: string | null;
  midtransTransactionId: string | null;
  midtransStatus: string | null;
  fraudStatus: string | null;
} {
  const str = (v: unknown): string | null =>
    typeof v === "string" && v.trim() ? v.trim() : null;

  const paymentType = str(payload.payment_type);
  const midtransTransactionId = str(payload.transaction_id);
  const midtransStatus = str(payload.transaction_status);
  const fraudStatus = str(payload.fraud_status);

  let paymentChannel: string | null = null;
  let paymentReference: string | null = null;

  if (Array.isArray(payload.va_numbers) && payload.va_numbers.length > 0) {
    const first = payload.va_numbers[0];
    if (isPlainRecord(first)) {
      paymentChannel = str(first.bank)?.toLowerCase() ?? null;
      paymentReference = str(first.va_number);
    }
  } else if (str(payload.permata_va_number)) {
    paymentChannel = "permata";
    paymentReference = str(payload.permata_va_number);
  } else if (str(payload.bill_key)) {
    paymentChannel = "mandiri";
    const biller = str(payload.biller_code);
    const billKey = str(payload.bill_key);
    paymentReference = biller && billKey ? `${biller}-${billKey}` : billKey;
  } else if (paymentType === "qris" || str(payload.acquirer)) {
    paymentChannel = str(payload.acquirer)?.toLowerCase() ?? "qris";
    paymentReference = midtransTransactionId;
  } else if (str(payload.store)) {
    paymentChannel = str(payload.store)?.toLowerCase() ?? null;
    paymentReference = str(payload.payment_code);
  } else if (str(payload.bank)) {
    paymentChannel = str(payload.bank)?.toLowerCase() ?? null;
    paymentReference = str(payload.masked_card);
  } else {
    paymentChannel = paymentType;
  }

  return {
    paymentType,
    paymentChannel,
    paymentReference,
    midtransTransactionId,
    midtransStatus,
    fraudStatus,
  };
}
