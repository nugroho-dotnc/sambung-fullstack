export type FeMode = "demo" | "live";

const rawUseMock = process.env.NEXT_PUBLIC_USE_MOCK?.trim().toLowerCase();
const rawFeMode = process.env.NEXT_PUBLIC_FE_MODE?.trim().toLowerCase();

/**
 * State 1 — Sumber Data (`NEXT_PUBLIC_USE_MOCK=true|false`, default `false`).
 * Terpisah dari mode tampilan FE: saat `false`, data tetap diambil riil dari backend
 * (`NEXT_PUBLIC_API_BASE_URL`) meskipun `NEXT_PUBLIC_FE_MODE=demo`.
 */
export const IS_MOCK_DATA = rawUseMock === "true";

/**
 * State 2 — Mode Tampilan & OTP FE (`NEXT_PUBLIC_FE_MODE=demo|live`, default `live`).
 * - `demo`: menampilkan elemen bantu demo (akun uji coba, petunjuk OTP demo, akun demo admin) & alur OTP demo.
 * - `live`: menyembunyikan seluruh elemen demo dan memakai alur OTP WhatsApp live.
 */
export const FE_MODE: FeMode = rawFeMode === "demo" ? "demo" : "live";
export const IS_DEMO_FE = FE_MODE === "demo";
export const IS_LIVE_FE = FE_MODE === "live";
