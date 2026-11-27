# AGENTS.md — Panduan Cepat & Aturan Agent (SAMBUNG)

Monorepo fullstack **SAMBUNG** (platform transaksi gabah digital Petani–Pembeli dengan acuan harga wajar & prakiraan AI).
Untuk referensi detail endpoint, skema database, rute halaman, dan gotcha teknis lengkap, baca [`docs/PROJECT_SUMMARY.md`](docs/PROJECT_SUMMARY.md) (lokal, di-ignore Git) dan [`sambung-fe/AGENTS.md`](sambung-fe/AGENTS.md) (aturan Next.js 16).

---

## 1. Aturan Wajib Agent: Selalu Simpan Log Perubahan Aplikasi

Setiap kali agent melakukan perubahan pada aplikasi (kode sumber, skema/migrasi database, variabel lingkungan, konfigurasi build, atau aset data), agent **WAJIB** mencatat perubahan tersebut ke [`CHANGELOG.md`](CHANGELOG.md) di bawah bagian `## [Unreleased]` sebelum menyatakan tugas selesai.

Format entri di `## [Unreleased]`:
- Gunakan subbagian standar: `Added`, `Changed`, `Fixed`, `Removed`, atau `Security` (hanya tulis yang relevan).
- Sertakan: tanggal (`YYYY-MM-DD`), ringkasan singkat **apa** yang berubah dan **mengapa**, file/modul terdampak, serta catatan khusus jika ada perubahan skema Prisma, `.env`, atau API contract.
- Saat perubahan di-release atau di-commit dalam batch baru, entri dapat dipindahkan/dikelompokkan sesuai tanggal atau versi rilis tanpa menghapus riwayat sebelumnya.

---

## 2. Peta Cepat Arsitektur

| Komponen | Lokasi | Stack Utama | Port Default |
|---|---|---|---|
| **Backend API** | `sambung-be/` | Node `>=22.18`, Express 5, TypeScript, Prisma 5.22, PostgreSQL, Zod 4 | `4000` |
| **Frontend Web** | `sambung-fe/` | Next.js 16.4 (App Router, Turbopack), React 19, Tailwind 4, shadcn/`@base-ui/react`, TanStack Query 5, Zod 4 | `3000` |
| **Dokumen & AI Data** | `docs/` (gitignored), `sambung-fe/data/ai/` | Spesifikasi, snapshot JSON AI v3 (`fair_price_params`, `forecast_produsen`, `price_board_4tier`, `spatial_disparity`, `model_evaluation`) | — |

Catatan runtime:
- `sambung-be` menjalankan `.ts` langsung lewat Node (`node --env-file-if-exists=.env --watch src/index.ts`), dan `src/config/env.ts` menolak `NODE_ENV=production`.
- `sambung-fe` memisahkan dua state lingkungan di `lib/config/fe-mode.ts`: `NEXT_PUBLIC_USE_MOCK` (`true` mengarahkan request `lib/api/client.ts` ke `sambung-fe/mock/server/router.ts`, `false`/default mengambil data riil dari Express API `NEXT_PUBLIC_API_BASE_URL` dengan `credentials: "include"`), dan `NEXT_PUBLIC_FE_MODE` (`"demo"` menampilkan elemen bantu demo & alur OTP demo di UI, sedangkan `"live"` menyembunyikan elemen demo & memakai alur OTP WhatsApp live — keduanya tetap memakai data backend riil selama `NEXT_PUBLIC_USE_MOCK=false`).

---

## 3. Cara Kerja Inti Aplikasi

1. **Autentikasi & Sesi (`sambung-be/src/modules/auth/`, `sambung-be/src/modules/admin/`)**
   - Petani/Pembeli memakai OTP 4 digit (`/auth/otp/request`, `/auth/otp/verify`, `/auth/register`) dengan cookie `httpOnly` `sambung_session` (token di-hash SHA-256 di tabel `auth_session`).
   - Mode OTP dikontrol `OTP_MODE`: `demo` (kode dikirim di `debugHint`) atau `live`/`fonnte` (WhatsApp via `FonnteOtpSender` dengan `FONNTE_TOKEN`).
   - Admin masuk lewat `POST /admin/auth/login` menggunakan `email` + `passwordHash` (SHA-256).
2. **Harga Wajar & Prakiraan AI (`pricing/`, `forecast/`, `features/price-check/`, `features/forecast/`)**
   - Backend memanggil HuggingFace Gradio Space (`AI_BASE_URL`, default `https://rizsd21-sambung-ai-api.hf.space`) dan fallback ke file JSON snapshot (`AI_SNAPSHOT_PATH`, `AI_FORECAST_SNAPSHOT_PATH`).
   - Lampu harga (`hijau`, `kuning`, `merah`) memakai `SystemParameter.fairPriceToleranceDelta` (default `0.03` = 300 bp). Harga `merah` wajib `redConfirmed: true` + `referenceVersion` cocok.
3. **Tawaran Panen & Katalog (`offers/`, `offer-moderation.ts`, `features/offers/`, `features/catalog/`)**
   - Mutasi (`create`, `update`, `publish`, `withdraw`) wajib header `Idempotency-Key` (UUID), dicek via `OfferRequest` + `pg_advisory_xact_lock` + `FOR UPDATE`, serta optimistic lock `version`.
   - Stok tersedia dihitung dinamis: `availableVolumeKg = totalVolumeKg - pending(reserved) - (approved + signed + shipping) - completed`.
   - Moderasi pengawas menyisipkan marker `[Catatan Pengawas]: ...` pada `Offer.notes` (`offer-moderation.ts`) dan tetap dipertahankan saat petani mengedit catatan.
4. **Kontrak, Negosiasi & Pemenuhan (`contracts/`, `features/contracts/`)**
   - Status kontrak: `pending` → `approved` → `signed` → `shipping` → `completed`, atau terminal `rejected`, `cancelled`, `expired`.
   - Background job `contracts.expiry.ts` berjalan tiap `5000ms` untuk menandai kontrak `pending` yang melewati `expiresAt` menjadi `expired`.
   - Kontak mitra (`farmerPhone`, `buyerPhone`) baru dibuka pada status `approved`, `signed`, `shipping`, `completed` (tetap di-mask untuk `admin`).
   - Pembeli/Petani melakukan polling kontrak tiap 5 detik dan notifikasi tiap 10 detik.

---

## 4. Perintah Penting & Verifikasi

### Backend (`cd sambung-be`)
```powershell
pnpm install
pnpm generate        # prisma generate
pnpm migrate         # prisma migrate deploy
pnpm seed:demo       # akun demo (Sari, Budi, Rina, Admin) + SystemParameter aktif (wajib OTP_MODE=demo)
pnpm dev             # server port 4000
pnpm typecheck       # tsc --noEmit
pnpm build           # prisma generate && tsc
# Uji integrasi (butuh DB *_test, mis. sambung_phase2_test):
$env:TEST_DATABASE_URL='postgresql://postgres@localhost:5432/sambung_phase2_test'
pnpm test:phase4
```

### Frontend (`cd sambung-fe`)
```powershell
pnpm install
pnpm dev             # Next.js Turbopack port 3000
pnpm typecheck       # tsc --noEmit
pnpm lint            # eslint
pnpm build           # next build (output: standalone)
```

---

## 5. Gotcha Penting Sebelum Mengedit

- **Sinkronisasi Skema vs Migrasi Prisma**: `sambung-be/prisma/schema.prisma` sudah memiliki kolom tanda tangan digital (`farmerSignature`, `buyerSignature`, `shippedAt`, `completedAt`) dan kode mendukung status `signed` & `shipping`, tetapi `prisma/migrations/003_contracts_negotiation/migration.sql` masih berisi SQL `CHECK` constraint lama (6 status) dan belum ada folder migrasi `005_*`. Perhatikan ini sebelum menjalankan migrasi dari nol pada DB baru.
- **CORS & JSON Strictness**: `FE_ORIGIN` di `sambung-be/.env` mendukung multi-origin dipisah koma; semua request `POST`/`PATCH` kecuali `/auth/logout` wajib header `Content-Type: application/json`.
- **Dokumen Lama di `docs/`**: Beberapa dokumen spesifikasi lama di `docs/` (mis. `PETA_INTEGRASI_FE_BE.md`) dibuat sebelum alur tanda tangan digital, `shipping`, `/notifications`, `/forecasts`, dan `FonnteOtpSender`; rujuk [`docs/PROJECT_SUMMARY.md`](docs/PROJECT_SUMMARY.md) dan kode sumber untuk kondisi aktual.
