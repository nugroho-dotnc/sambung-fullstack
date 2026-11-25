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

# Adapter Layanan AI & Cadangan Snapshot
AI_SNAPSHOT_PATH=../sambung-fe/data/ai/fair_price_params.json
AI_FORECAST_SNAPSHOT_PATH=../sambung-fe/data/ai/forecast_produsen.json
AI_TIMEOUT_MS=15000
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

## 5. Rangkaian Pengujian Integrasi Otomatis

Backend dilengkapi suite pengujian integrasi otomatis menyeluruh terhadap database PostgreSQL nyata.

Untuk menjalankan pengujian pada database pengujian terisolasi (`sambung_phase2_test`):

```powershell
# Terapkan migrasi pada database uji terlebih dahulu
$env:DATABASE_URL = 'postgresql://postgres@localhost:5432/sambung_phase2_test'
pnpm migrate

# Jalankan seluruh 5 test suite Fase 1–4
$env:TEST_DATABASE_URL = 'postgresql://postgres@localhost:5432/sambung_phase2_test'
pnpm test:phase4
```

### Rincian Test Suite:
1. `auth.test.mjs`: Uji 2 sesi terpisah, verifikasi OTP demo, batas percobaan, registrasi akun, dan logout.
2. `offers-catalog.test.mjs`: Uji penerbitan tawaran 1.000 kg, filter katalog, penarikan tawaran, dan idempotensi.
3. `contracts.test.mjs`: Uji pesanan parsial (300 kg dari 1.000 kg), negosiasi berversi, penguncian baris конкурен (*row-level locking*), pelepasan stok, dan 2 konfirmasi selesai.
4. `forecast.test.mjs`: Uji pemanggilan live AI Space Gradio v3, interval keyakinan 80%, konversi turunan GKP/GKG, kontribusi TreeSHAP, dan penanganan fallback.
5. `notifications-admin.test.mjs`: Uji login pengawas admin, pembacaan agregat statistik, mutasi parameter pasar, pencatatan audit log, dan siklus notifikasi transaksi.

---

## 6. Struktur Modular Backend (`src/`)

```
src/
├── config/             # Validasi variabel lingkungan Zod (env.ts)
├── db/                 # Inisialisasi Prisma Client tunggal (prisma.ts)
├── middleware/         # Penanganan CORS, origin, dan error handler seragam (error-handler.ts)
├── modules/
│   ├── auth/           # Identitas, OTP demo challenge, sesi cookie (auth.routes.ts, auth.service.ts)
│   ├── pricing/        # Adapter harga wajar AI Gradio v3 & fallback snapshot (pricing.service.ts)
│   ├── offers/         # Pengelolaan tawaran panen & katalog pasar (offers.routes.ts, offers.service.ts)
│   ├── contracts/      # Transaksi parsial, negosiasi berversi, & tenggat kedaluwarsa (contracts.service.ts)
│   ├── forecast/       # Prakiraan harga AI 2w/4w & faktor TreeSHAP (forecast.service.ts, ai-forecast.client.ts)
│   ├── notifications/  # Layanan notifikasi transaksi berbasis event (notifications.service.ts)
│   └── admin/          # Agregasi data, parameter pasar dinamis, & audit log (admin.service.ts)
├── shared/             # Kelas ApiError standar RFC-7807 (api-error.ts)
├── app.ts              # Konfigurasi aplikasi Express & perutean
└── index.ts            # Entry point server HTTP & background job timer tenggat
```

---

## 7. Riwayat Migrasi Prisma (`prisma/migrations/`)

1. `001_identity`: Tabel `account`, `otp_challenge`, `auth_session`, dan `schema_migration`.
2. `002_offers_pricing_catalog`: Tabel `Region`, `Offer`, `OfferRequest` (idempotensi).
3. `003_contracts_negotiation`: Tabel `Contract` dan `ContractPrice` (riwayat tawar-menawar).
4. `004_notifications_and_admin`: Tabel `notification`, `system_parameter`, `audit_log`, serta kolom email/password pada `account`.
