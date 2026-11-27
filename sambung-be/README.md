# SAMBUNG Backend (`sambung-be`)

Backend layanan transaksi gabah digital, integrasi kecerdasan harga AI, notifikasi dinamis, dan tata kelola pengawas (Fase 1–4). Dibangun menggunakan Express 5, TypeScript, Prisma ORM, PostgreSQL, dan Zod.

---

## 1. Prasyarat Lingkungan

- **Node.js**: `>= 22.18.0` (direkomendasikan Node 24)
- **Package Manager**: `pnpm` (versi `12.23.0`)
- **Database**: PostgreSQL lokal (misal: database `sambung` untuk aplikasi dan `sambung_phase2_test` untuk pengujian)

---

## 2. Pengaturan Konfigurasi Lingkungan (`.env`)

Salin berkas contoh konfigurasi ke `.env`:

```powershell
Copy-Item .env.example .env
```

Sesuaikan nilai di dalam `.env`:

```env
DATABASE_URL=postgresql://postgres@localhost:5432/sambung
FE_ORIGIN=http://localhost:3000
PORT=4000
OTP_MODE=demo

# Adapter Layanan AI Sambung Predict v1 (FastAPI REST, tanpa fallback lokal)
AI_BASE_URL=https://rizsd21-sambung-model.hf.space
AI_API_KEY=your-sambung-api-key
AI_TIMEOUT_MS=20000
AI_PREDICT_LIVE_RATE_LIMIT_MAX=10
AI_PREDICT_LIVE_RATE_LIMIT_WINDOW_MS=60000
```

> **Catatan Pengujian Multi-Device (Laptop + HP):**
> Jika menguji dari ponsel di jaringan WiFi yang sama, ubah `localhost` pada `FE_ORIGIN` menjadi IP lokal laptop Anda (contoh: `FE_ORIGIN=http://192.168.1.10:3000`).

---

## 3. Langkah Instalasi, Migrasi & Menjalankan Server

Jalankan perintah berikut secara berurutan:

```powershell
# 1. Pasang dependensi
pnpm install

# 2. Bangun Prisma Client
pnpm generate

# 3. Jalankan migrasi database
pnpm migrate

# 4. Terapkan data awal (seed demo akun & parameter pasar)
pnpm seed:demo

# 5. Jalankan server (mode development dengan auto-reload)
pnpm dev
```

Server backend akan aktif di `http://localhost:4000`. Endpoint pemeriksaan kesehatan server tersedia di `GET /health`.

---

## 4. Akun Demo Bawaan (`Seed`)

Perintah `pnpm seed:demo` menyediakan 4 akun siap pakai:

| Peran | Nama | Nomor Ponsel / Email | Kredensial / OTP | Keterangan |
|---|---|---|---|---|
| **Petani** | Sari | `081234567890` | Kode OTP demo di layar | Menerbitkan tawaran panen, tawar balik, konfirmasi selesai |
| **Pembeli** | Budi | `081398765432` | Kode OTP demo di layar | Memesan volume parsial, tawar harga, konfirmasi selesai |
| **Pembeli** | Rina | `081398765433` | Kode OTP demo di layar | Uji pemesanan konkuren bersaing atas sisa stok |
| **Admin** | Pengawas Sistem | `admin@sambung.id` | Kata sandi: `admin123` | Memantau statistik, kalibrasi parameter pasar, audit log |

---

## 5. Daftar Endpoint Integrasi AI (`Sambung Predict v1`)

Seluruh endpoint AI di `sambung-be` memanggil layanan FastAPI `Sambung Predict v1` menggunakan klien terpusat `ai-api.client.ts` (cache in-memory 60 detik khusus rute baca, *stale-if-error* 10 menit, nol fallback lokal, dan validasi ketat `422 INVALID_INPUT` via Zod `strictObject`):

### Rute Publik (Tanpa Sesi Login)
- `GET /ai/health`: Kesiapan layanan AI (`200` siap / `503` *starting* atau *unavailable*).
- `GET /forecasts` & `GET /forecasts/meta`: Prakiraan harga beras produsen +2w/+4w beserta faktor TreeSHAP (`province`, `horizonWeeks`, `activeOnly`).
- `GET /spatial-disparity`: Posisi disparitas harga 34 provinsi terhadap median nasional (`province`, `status`).
- `GET /price-board`: Papan harga 4 tingkat rantai pasok `Beras Medium I` dan tren historis (`region`, `period`).
- `GET /fair-price/params`: Parameter SKGB, rasio empiris Bapanas, HPP 2026, serta acuan 35 wilayah dengan overlay `SystemParameter` aktif dari DB.
- `POST /fair-price/calculate`: Kalkulasi deterministik harga wajar GKP/GKG dengan nilai baku `rendemen` dan `governmentFloorPriceGKP` dari DB bila tidak dikirim pemanggil.
- `GET /fair-price-references` & `POST /price-checks/preview`: Referensi harga wajar per kecamatan (`Region`) dan evaluasi lampu harga penawaran/kontrak (`hijau`, `kuning`, `merah`).

### Rute Pengawas Sistem (`Admin` Wajib Cookie Sesi)
- `GET /admin/observations`: Daftar harga acuan GKP 34 provinsi langsung dari `/api/v1/fair-price/params`.
- `GET /admin/model-evaluation`: Laporan evaluasi walk-forward 8-fold dan log karantina model AI.
- `POST /admin/predict/live`: Simulasi *What-If* **stateless** (*rate limit* bawaan 10 permintaan per 60 detik per aktor; kelebihan kuota mengembalikan `429 AI_RATE_LIMITED` beserta header `Retry-After`).
- `POST /admin/ai/ingest`: Memasukkan data resmi mingguan (`weekStart` kalender valid, menolak field simulasi sesuai `FR-031.11`), membersihkan cache AI, dan mencatat ke `AuditLog`.

---

## 6. Rangkaian Pengujian Integrasi Otomatis

Backend dilengkapi suite pengujian integrasi otomatis menyeluruh terhadap database PostgreSQL nyata.

Untuk menjalankan pengujian pada database pengujian terisolasi (`sambung_phase2_test`):

```powershell
# Terapkan migrasi pada database uji terlebih dahulu
$env:DATABASE_URL = 'postgresql://postgres@localhost:5432/sambung_phase2_test'
pnpm migrate

# Jalankan seluruh 7 test suite Fase 1–4
$env:TEST_DATABASE_URL = 'postgresql://postgres@localhost:5432/sambung_phase2_test'
pnpm test:phase4
```

### Rincian Test Suite:
1. `auth.test.mjs`: Uji 2 sesi terpisah, verifikasi OTP demo, batas percobaan, registrasi akun, dan logout.
2. `offers-catalog.test.mjs`: Uji penerbitan tawaran 1.000 kg, filter katalog, penarikan tawaran, dan idempotensi.
3. `contracts.test.mjs`: Uji pesanan parsial (300 kg dari 1.000 kg), negosiasi berversi, penguncian baris konkuren (*row-level locking*), pelepasan stok, dan konfirmasi selesai.
4. `forecast.test.mjs`: Uji pemanggilan live AI Space `Sambung Predict v1` (FastAPI REST + `X-API-Key`), interval keyakinan 80%, konversi turunan GKP/GKG, serta kontribusi TreeSHAP.
5. `notifications-admin.test.mjs`: Uji login pengawas admin, pembacaan agregat statistik, mutasi parameter pasar, pencatatan audit log, dan siklus notifikasi transaksi.
6. `ai-api.client.test.mjs`: Uji klien terpusat REST AI 9 endpoint, cache TTL 60 detik, *stale-if-error* 10 menit, dedupe *in-flight*, retry GET selektif, dan pemetaan error.
7. `ai.routes.test.mjs`: Uji seluruh rute publik AI dan rute admin AI, validasi ketat Zod `422`, overlay `SystemParameter` tanpa mutasi cache, *rate limit* `429`, `AuditLog` ingest, invalidasi cache, serta smoke test baca-saja live ke Hugging Face Space.

---

## 7. Struktur Modular Backend (`src/`)

```
src/
├── config/             # Validasi variabel lingkungan Zod (env.ts)
├── db/                 # Inisialisasi Prisma Client tunggal (prisma.ts)
├── middleware/         # Penanganan CORS, origin, logging, dan error handler (error-handler.ts)
├── modules/
│   ├── ai/             # Klien REST 9 endpoint, skema Zod, rate limiter, service, & router AI
│   ├── auth/           # Identitas, OTP demo/WhatsApp challenge, sesi cookie
│   ├── pricing/        # Adapter harga wajar via klien AI terpusat (pricing.service.ts, ai-price.client.ts)
│   ├── offers/         # Pengelolaan tawaran panen & katalog pasar (offers.routes.ts, offers.service.ts)
│   ├── contracts/      # Transaksi parsial, negosiasi berversi, tanda tangan, & tenggat kedaluwarsa
│   ├── forecast/       # Prakiraan harga AI 2w/4w & faktor TreeSHAP (forecast.service.ts, ai-forecast.client.ts)
│   ├── notifications/  # Layanan notifikasi transaksi berbasis event (notifications.service.ts)
│   └── admin/          # Agregasi data, parameter pasar dinamis, model AI, observasi, & audit log
├── shared/             # Kelas ApiError standar RFC-7807 (api-error.ts)
├── app.ts              # Konfigurasi aplikasi Express & perutean
└── index.ts            # Entry point server HTTP & background job timer tenggat
```

---

## 8. Riwayat Migrasi Prisma (`prisma/migrations/`)

1. `001_identity`: Tabel `account`, `otp_challenge`, `auth_session`, dan `schema_migration`.
2. `002_offers_pricing_catalog`: Tabel `Region`, `Offer`, `OfferRequest` (idempotensi).
3. `003_contracts_negotiation`: Tabel `Contract` dan `ContractPrice` (riwayat tawar-menawar).
4. `004_notifications_and_admin`: Tabel `notification`, `system_parameter`, `audit_log`, serta kolom email/password pada `account`.
5. `005_contract_signatures_and_fulfillment`: Kolom tanda tangan digital petani/pembeli, `shippedAt`, `completedAt`, dan pembaruan *check constraint* status kontrak.
