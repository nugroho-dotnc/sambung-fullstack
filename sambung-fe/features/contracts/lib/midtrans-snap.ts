export interface MidtransSnapCallbacks {
  onSuccess?: (result?: unknown) => void;
  onPending?: (result?: unknown) => void;
  onError?: (result?: unknown) => void;
  onClose?: () => void;
}

export interface MidtransSnap {
  pay: (snapToken: string, callbacks?: MidtransSnapCallbacks) => void;
}

declare global {
  interface Window {
    snap?: MidtransSnap;
  }
}

const SNAP_SCRIPT_SELECTOR = 'script[data-sambung-midtrans-snap="true"]';
const SNAP_LOAD_TIMEOUT_MS = 10_000;

let activeLoadPromise: Promise<MidtransSnap> | null = null;
let activeScriptKey: string | null = null;

function isLocalhost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return lower === "localhost" || lower === "127.0.0.1";
}

function assertSandboxSnapScriptUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new Error("Alamat script Midtrans Snap tidak valid.");
  }

  const isOfficialSandbox =
    parsed.protocol === "https:" &&
    parsed.hostname.toLowerCase() === "app.sandbox.midtrans.com" &&
    parsed.pathname === "/snap/snap.js";
  const isLocalMock =
    (parsed.protocol === "http:" || parsed.protocol === "https:") &&
    isLocalhost(parsed.hostname) &&
    parsed.pathname.endsWith("/snap/snap.js");

  if (!isOfficialSandbox && !isLocalMock) {
    throw new Error("Script pembayaran hanya diperbolehkan dari host Midtrans Sandbox.");
  }
  return parsed.toString();
}

function assertSandboxRedirectUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new Error("Tautan pembayaran Midtrans tidak valid.");
  }

  const isOfficialSandbox =
    parsed.protocol === "https:" &&
    parsed.hostname.toLowerCase() === "app.sandbox.midtrans.com";
  const isLocalMock =
    (parsed.protocol === "http:" || parsed.protocol === "https:") &&
    isLocalhost(parsed.hostname);

  if (!isOfficialSandbox && !isLocalMock) {
    throw new Error("Halaman pembayaran hanya diperbolehkan pada host Midtrans Sandbox.");
  }
  return parsed.toString();
}

/**
 * Lazy-loads the Midtrans Sandbox Snap.js library only when payment is initiated, locking strictly to Sandbox hosts.
 */
export async function loadMidtransSnapScript(
  snapScriptUrl: string,
  clientKey: string
): Promise<MidtransSnap> {
  if (typeof window === "undefined") {
    throw new Error("Pembayaran Snap hanya dapat dibuka dari browser.");
  }
  const validatedUrl = assertSandboxSnapScriptUrl(snapScriptUrl);
  if (window.snap && typeof window.snap.pay === "function") {
    return window.snap;
  }

  const cacheKey = `${validatedUrl}|${clientKey}`;
  if (activeLoadPromise && activeScriptKey === cacheKey) {
    return activeLoadPromise;
  }

  // Clean up any stale or failed previous script elements before inserting a fresh tag.
  document.querySelectorAll(SNAP_SCRIPT_SELECTOR).forEach((el) => el.remove());

  activeScriptKey = cacheKey;
  activeLoadPromise = new Promise<MidtransSnap>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = validatedUrl;
    script.async = true;
    script.setAttribute("data-client-key", clientKey);
    script.setAttribute("data-sambung-midtrans-snap", "true");

    let settled = false;
    const timeoutId = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      script.remove();
      activeLoadPromise = null;
      activeScriptKey = null;
      reject(new Error("Waktu muat popup Midtrans Snap habis."));
    }, SNAP_LOAD_TIMEOUT_MS);

    script.onload = () => {
      if (settled) return;
      window.clearTimeout(timeoutId);
      if (window.snap && typeof window.snap.pay === "function") {
        settled = true;
        resolve(window.snap);
        return;
      }
      settled = true;
      script.remove();
      activeLoadPromise = null;
      activeScriptKey = null;
      reject(new Error("Popup Midtrans Snap gagal diinisialisasi."));
    };

    script.onerror = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      script.remove();
      activeLoadPromise = null;
      activeScriptKey = null;
      reject(new Error("Skrip Midtrans Snap gagal dimuat atau diblokir browser."));
    };

    document.body.appendChild(script);
  });

  return activeLoadPromise;
}

/**
 * Opens Midtrans Sandbox Snap checkout popup, falling back to a new tab redirect if Snap.js is blocked.
 */
export async function openSnapCheckout(params: {
  snapToken: string;
  redirectUrl: string;
  clientKey: string;
  snapScriptUrl: string;
  callbacks: MidtransSnapCallbacks;
}): Promise<{ mode: "popup" | "redirect" }> {
  try {
    const snap = await loadMidtransSnapScript(params.snapScriptUrl, params.clientKey);
    snap.pay(params.snapToken, params.callbacks);
    return { mode: "popup" };
  } catch {
    const validatedRedirect = assertSandboxRedirectUrl(params.redirectUrl);
    window.open(validatedRedirect, "_blank", "noopener,noreferrer");
    return { mode: "redirect" };
  }
}
