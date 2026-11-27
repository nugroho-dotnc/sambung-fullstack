# Changelog

Semua perubahan penting pada proyek **SAMBUNG** (`sambung-be` dan `sambung-fe`) dicatat di berkas ini mengikuti format [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

> **Aturan Agent**: Setiap perubahan kode, skema database, konfigurasi, atau aset data **wajib** ditambahkan ke bagian `## [Unreleased]` sebelum tugas selesai.

---

## [Unreleased]

### Added
- **Backend (`sambung-be`) — Suite Tes Rute AI & Dokumentasi Integrasi (Tahap 3 Backend Only, 2026-11-27)**:
  - Menambahkan `sambung-be/tests/integration/ai.routes.test.mjs` yang menguji seluruh rute publik AI (`/ai/health`, `/spatial-disparity`, `/price-board`, `/fair-price/params`, `/fair-price/calculate`, `/forecasts`), validasi ketat Zod `422`, isolasi cache overlay `SystemParameter`, penerusan `rendemen`/`hppGovernment` ke `price-checks/preview`, guard admin `401`/`403`, `GET /admin/observations` 34 provinsi nyata, `POST /admin/predict/live` (*stateless* + *rate limit* `429` + `Retry-After`), `POST /admin/ai/ingest` (`422` data simulasi/kalender + `AuditLog` + clear cache), serta smoke test baca-saja ke HF Space asli.
  - Memperbarui `sambung-be/README.md` (daftar endpoint AI, konfigurasi *rate limit*, 7 suite uji, struktur `src/modules/ai/`, dan migrasi `005`) serta `sambung-be/.env.example` (`AI_PREDICT_LIVE_RATE_LIMIT_*`).
- **Backend (`sambung-be`) — Rute Express AI, Validasi Zod Ketat, Guard Admin, & Rate Limit (Tahap 2 Backend Only, 2026-11-27)**:
  - Menambahkan `src/modules/ai/ai.schemas.ts`, `ai-rate-limit.ts` (sliding-window per aktor pada `POST /admin/predict/live` dengan status `429 AI_RATE_LIMITED` + header `Retry-After`), `ai.service.ts`, dan `ai.routes.ts` yang dipasang di `src/app.ts` sekaligus menaikkan batas `express.json` ke `128kb`.
  - Mengekspos rute proxy publik tervalidasi: `GET /ai/health`, `GET /spatial-disparity`, `GET /price-board`, `GET /fair-price/params` (dengan overlay aman `SystemParameter` aktif tanpa memutasi cache), dan `POST /fair-price/calculate`.
  - Mengekspos 3 rute pengawas berpenjaga `getAdminActor` di `src/modules/admin/admin.routes.ts` & `admin.service.ts`: `GET /admin/model-evaluation`, `POST /admin/predict/live` (stateless + *rate limit*), dan `POST /admin/ai/ingest` (validasi ketat tanpa data simulasi + pembersihan cache AI + pencatatan `AuditLog`).
- **Backend (`sambung-be`) — Klien REST Terpusat `Sambung Predict v1` (`ai-api.client.ts`, Tahap 1 Backend Only, 2026-11-27)**:
  - Menambahkan `sambung-be/src/modules/ai/ai-api.client.ts` yang melayani seluruh 9 endpoint `Sambung Predict v1` (`GET /health` publik tanpa API key + 8 endpoint `/api/v1/*` dengan header `X-API-Key` dan pembacaan env dinamis `AI_BASE_URL`, `AI_API_KEY`, `AI_TIMEOUT_MS`).
  - Menyertakan cache memori TTL 60 detik dengan kloning `structuredClone`, dedupe *in-flight*, *stale-if-error* hingga 10 menit, `clearAiCache()`, pemisahan cache per `baseUrl`, retry 1 kali khusus endpoint `GET` baca saat `AI_SERVICE_STARTING`, pemetaan error 503/5xx/401/400/404/422 (`detail`)/429 (`Retry-After`)/4xx/non-JSON tanpa kebocoran pesan internal maupun API key, logging ringkas tanpa body/query, serta pemanasan non-blocking `warmUpAi()` saat startup di `sambung-be/src/index.ts`.
  - Memperbarui `sambung-be/src/shared/api-error.ts` dan `sambung-be/src/middleware/error-handler.ts` untuk mempertahankan `detail` pada respons `422` serta meneruskan header `Retry-After` pada `429`.
  - Menambahkan suite uji komprehensif `sambung-be/tests/integration/ai-api.client.test.mjs` menggunakan server mock HTTP lokal dan fake timer `Date`.
- **Frontend (`sambung-fe`) — Tipografi Tanda Tangan Digital (Alex Brush Font)**:
  - Mengonfigurasi font kaligrafi lokal `AlexBrush-Regular.ttf` pada `sambung-fe/app/fonts/`, `layout.tsx`, dan `globals.css` dengan token `--font-signature` serta utility class `font-signature`.
  - Menerapkan font Alex Brush pada pratinjau ketik tanda tangan di dialog (`signature-dialog.tsx`) dan tampilan lembar kesepakatan digital / cetak PDF (`bukti/page.tsx`).
- **Frontend (`sambung-fe`) — Komponen Perjalanan Kontrak Terpadu (`ContractTimeline`)**:
  - Menambahkan `sambung-fe/features/contracts/components/contract-timeline.tsx` dan mengintegrasikannya ke `negotiation-room.tsx` menggantikan riwayat chat statis.
  - Menampilkan alur sekuensial lengkap: Pesanan Diajukan $\rightarrow$ Histori Tawar Balik $\rightarrow$ Harga Disepakati $\rightarrow$ Tanda Tangan Petani & Pembeli $\rightarrow$ Pengiriman $\rightarrow$ Penerimaan Selesai (atau status Pembatalan) dengan icon Lucide murni tanpa emotikon sesuai referensi visual.

### Changed
- **Backend (`sambung-be`) — Sinkronisasi Parameter Sistem, Observasi Admin Live, & Validasi Ketat Kueri (Tahap 2 Backend Only, 2026-11-27)**:
  - Memperketat `forecastQuerySchema` (`z.strictObject`) serta menambahkan `modelName` opsional pada metadata `forecast.service.ts`.
  - Menghubungkan `pricing.service.ts` dan `ai-price.client.ts` ke `rendemenGKP`, `rendemenGKG`, dan `governmentFloorPriceGKP` aktif di `SystemParameter` (dengan guard tipe dan rentang yang aman bagi mock parsial).
  - Mengganti 3 baris observasi *hardcoded* pada `GET /admin/observations` di `src/modules/admin/admin.service.ts` dengan data acuan 34 provinsi nyata dari `/api/v1/fair-price/params`, menambahkan `clearAiCache()` pada `updateSystemParameters` dan `publishObservations`, serta memperketat rentang input `POST /admin/parameters`. Frontend (`sambung-fe`), skema Prisma, modul riwayat AI, dan payment gateway tetap tidak disentuh.
- **Backend (`sambung-be`) — Migrasi Klien `forecast` dan `pricing` ke FastAPI REST (Tahap 1 Backend Only, 2026-11-27)**:
  - Mengalihkan `sambung-be/src/modules/forecast/ai-forecast.client.ts`, `forecast.types.ts`, dan `sambung-be/src/modules/pricing/ai-price.client.ts` ke `ai-api.client.ts`, serta memvalidasi `AI_BASE_URL`, `AI_API_KEY`, dan `AI_TIMEOUT_MS` di `sambung-be/src/config/env.ts`.
  - Memperbarui `sambung-be/.env`, `sambung-be/.env.example`, `sambung-be/README.md`, serta tes integrasi `offers-catalog.test.mjs`, `contracts.test.mjs` (menyesuaikan asersi visibilitas kontak BR-018 setelah tanda tangan/selesai serta menghilangkan ketergantungan snapshot lokal), dan `forecast.test.mjs` ke kontrak FastAPI REST `v1`. Frontend (`sambung-fe`), skema Prisma, modul riwayat AI, dan payment gateway tidak disentuh pada tahap ini.
- **AI (`sambung-ai/api` & Hugging Face Space `rizsd21/Sambung-Model`) — Bahasa Penjelasan SHAP Mudah Dipahami & Spesifik Arah Dampak (2026-11-27)**:
  - Menambahkan modul bersama `shap_narrator.py` di `D:\KULIAH PNJ\sambung-ai\api\` yang memisahkan kalimat penjelasan SHAP berdasarkan arah dampak (`impact > 0` mendorong naik, `impact < 0` menahan/menekan harga, `impact == 0` pasar cenderung stabil) dalam bahasa Indonesia sehari-hari bebas istilah teknis, sambil tetap jujur terhadap angka interaksi fitur.
  - Menyederhanakan judul label faktor (`Pengaruh Harga Daerah Sentra Lain`, `Harga & Selisih Pasar Lokal`, `Kondisi Cuaca & Curah Hujan`, `Musim Panen & Pasokan Daerah`, `Acuan HPP & Musim Hari Besar`, `Pasar Cenderung Stabil`, dan kategori spasial) di `inference.py`, `build_api_artifacts.py`, dan `demo_ui.py` (menambahkan kolom `Penjelasan` pada tabel disparitas spasial).
  - Meregenerasi artefak `artifacts/forecast_produsen.json` (40 item aktif + 6 item pasar stabil) dan `artifacts/spatial_disparity.json` (136 faktor pada 34 provinsi), menyinkronkan contoh di `API_CONTRACT.md`, dan melakukan deployment ke Hugging Face Space `rizsd21/Sambung-Model` (`commit d59f200e2ce889a2f17563de7575c25ef791c9d2`).
- **AI Demo (`ai/api`) — Redesign UI Gradio Berbasis Apple Human Interface Guidelines & Penyederhanaan Label API (2026-11-27)**:
  - Merombak tampilan demo Python di `ai/api/demo_ui.py` dan pemasangannya di `ai/api/main.py` dengan tema kustom Gradio (`build_sambung_theme`), palet resmi hijau agraria (`#78B000`, `#2F8208`, `#0D5907`), emas amber (`#E7A303`, `#C08809`, `#855C05`), serta aksen oranye CTA (`#D85A16` / `#E0763E`), kartu bento KPI, bilah navigasi pil tersegmentasi, grafik Matplotlib berbingkai bersih (`show_label=False` + `suptitle`), pembersihan label/border ganda di mode gelap, pengaturan lebar kolom tabel, dan dukungan mode gelap.
  - Menyederhanakan nilai `method` respons API menjadi `"Mode AI"`, `"Fallback Dataset"`, dan `"Mode AI (Simulasi)"` serta meringkas teks `derivedDisclaimer` pada `ai/api/build_api_artifacts.py`, `ai/api/inference.py`, `ai/api/demo_ui.py`, `ai/api/API_CONTRACT.md`, dan artefak `ai/api/artifacts/forecast_produsen.json`.
  - Menyesuaikan `GET /api/v1/price-board` dan tab *Papan Harga & Spasial* agar murni menampilkan data asli `Beras Medium I` (menghapus pengali buatan `Beras Premium` dan skala semu `GKP` serta menyederhanakan parameter menjadi `region` dan `period`), serta menambahkan kontrol `stickyWeeks` pada panel simulasi *What-If* di `ai/api/demo_ui.py`.
  - Mendeploy `Sambung Predict v1` ke Hugging Face Space `rizsd21/Sambung-Model` (`https://rizsd21-sambung-model.hf.space`, `sdk: gradio` dengan `app.py` FastAPI Uvicorn dan `ssr_mode=False` pada perangkat `zero-a10g`) beserta secret `SAMBUNG_API_KEY`.
  - Memindahkan seluruh sisa folder `ai/` (`api`, `artifacts`, `cache`, `clean`, `docs`, `eda_outputs`, `hf-space`, `notebooks`, `raw`, `requirements.txt`) keluar dari root monorepo ke `D:\KULIAH PNJ\sambung-ai\` serta menghapus `ai/.venv` lokal.
- **Frontend (`sambung-fe`) — Redesain Tipografi & Arsitektur Kartu Dasbor Admin**:
  - Mengadopsi prinsip desain bersih (*clean UI*) dari panel Petani dan Produsen pada `sambung-fe/app/admin/(panel)/page.tsx`:
    - Mengubah 4 kartu metrik kapital kaku menjadi 3 kartu metrik lapang (*sentence case* dan angka hero `text-3xl font-extrabold font-display` dengan satuan terpisah).
    - Menghapus grid 6 kartu modul navigasi yang redundan dengan Sidebar, menggantinya dengan panel aksi prioritas (*Antrean Moderasi Penawaran Petani*).
    - Meratakan tampilan log audit sistem menjadi baris datar minimalis (`divide-y divide-border/60`) tanpa kartu bertumpuk (*no nested cards*).
    - Menyederhanakan kartu batas otoritas pengawas menjadi card datar satu lapis yang proporsional.
- **Frontend (`sambung-fe`) — Navbar Kapsul Melayang Dinamis (Floating Capsule to Full Width)**:
  - Mengubah `sambung-fe/components/layouts/Navbar.tsx` menjadi floating capsule navbar dinamis sesuai referensi visual:
    - Default (paling atas): Mengambang elegan sebagai pill `rounded-full` dengan latar frosted glass `backdrop-blur-md`, brand SAMBUNG + tagline, tautan dengan titik pemisah `•`, dan tombol CTA kapsul kontras tinggi berikon `ArrowUpRight`.
    - Saat di-scroll: Bertransisi otomatis memenuhi seluruh lebar layar (`w-full rounded-none` menempel di atas) menjadi bentuk navbar normal.
  - Menyesuaikan padding atas pada `sambung-fe/app/(public)/_sections/hero.tsx` agar hamparan gambar latar sawah mengalir di bawah navbar tanpa menabrak judul teks.
- **Frontend (`sambung-fe`) — Filter Komoditas Katalog Pasokan Menjadi Dropdown Select**:
  - Memperbarui `sambung-fe/app/(workspace)/pembeli/katalog/page.tsx` dari tab horizontal yang patah baris pada layar desktop menjadi `<Select>` dropdown universal yang rapi.
- **Backend & Frontend — Penyesuaian Keterbukaan Kontak Mitra (BR-018)**:
  - Kontak nomor telepon dan WhatsApp mitra kini baru dibuka ketika kedua belah pihak telah menyelesaikan tanda tangan digital (status `signed`, `shipping`, `completed`), bukan lagi pada saat harga disepakati (`approved`).

### Fixed
- **Backend (`sambung-be`) — Hitung Stok Kontrak Aktif (`signed` & `shipping`)**:
  - Memperbarui fungsi `present()` pada `sambung-be/src/modules/offers/offers.service.ts` agar `approvedVolumeKg` menjumlahkan status `approved`, `signed`, dan `shipping` (sebelumnya hanya `approved`), sehingga stok yang sedang ditandatangani atau dikirim tidak kembali dihitung sebagai `availableVolumeKg`.
- **Backend (`sambung-be`) — Check Constraint PostgreSQL Status Kontrak**:
  - Memperbarui check constraint SQL `Contract_status_check` agar mengizinkan status `'signed'` dan `'shipping'` dan mencatatnya pada migrasi `005_contract_signatures_and_fulfillment/migration.sql`.

### Removed
- **Backend (`sambung-be`) — Penghapusan Protokol Gradio SSE & Fallback File Snapshot Lokal (`2026-11-27`)**:
  - Menghapus seluruh impor `node:fs/promises`, jalur `/gradio_api/call/*`, serta penggunaan `AI_SNAPSHOT_PATH` dan `AI_FORECAST_SNAPSHOT_PATH` dari modul `forecast`, `pricing`, `.env`, `.env.example`, dan README `sambung-be`.

---

## [2026-11-27]

### Added
- **Dokumentasi Agent & Log Perubahan**:
  - Menambahkan `AGENTS.md` di root untuk ringkasan cepat arsitektur dan aturan wajib pencatatan perubahan.
  - Menambahkan `docs/PROJECT_SUMMARY.md` (lokal/gitignored) sebagai peta teknis lengkap BE, FE, skema DB, dan gotcha integrasi.
  - Menambahkan `CHANGELOG.md` dengan riwayat fitur dari awal repositori.
- **Kontrak Digital & Alur Pemenuhan Sekuensial** (`23099c6`):
  - Backend: Menambah status kontrak `signed` dan `shipping`, aksi `sign` (`draw` / `type`), `ship`, dan `receive`, serta kolom tanda tangan digital & timestamp (`farmerSignature*`, `buyerSignature*`, `shippedAt`, `completedAt`) di `sambung-be/prisma/schema.prisma`, `contracts.schemas.ts`, dan `contracts.service.ts`.
  - Frontend: Menambahkan `signature-dialog.tsx` dan `fulfillment-dialogs.tsx`, memperbarui `negotiation-room.tsx`, `state-machine.ts`, `kontrak/page.tsx`, `admin/(panel)/kontrak/page.tsx`, serta optimasi layout cetak PDF pada `kontrak/[id]/bukti/page.tsx`, `AppShell.tsx`, `Sidebar.tsx`, `TopBar.tsx`, dan `globals.css`.
- **Logging Permintaan Terminal** (`0957c90`):
  - Menambahkan middleware `sambung-be/src/middleware/request-logger.ts` dan memasangnya di `sambung-be/src/app.ts` untuk mencetak method, URL, status HTTP berwarna, durasi, serta pesan/kode respons.
- **Dual-Mode OTP (Demo & Live WhatsApp via Fonnte)** (`548e9ef`, `a93ac2d`):
  - Backend: Menambahkan `src/modules/auth/otp/` (`otp-sender.interface.ts`, `otp-factory.ts`, `mock-otp-sender.ts`, `fonnte-otp-sender.ts`), endpoint `GET /auth/otp/mode`, serta dukungan `OTP_MODE=live` dan `FONNTE_TOKEN` pada `src/config/env.ts`.
  - Frontend: Memperbarui `masuk/page.tsx`, `masuk/verifikasi/page.tsx`, `use-auth.ts`, dan `auth.service.ts` agar UI beradaptasi dengan mode OTP aktif.

### Fixed
- **UI Form Wizard Tawaran Petani** (`7acd85a`):
  - Merapikan layout grid, penggunaan `Textarea`, serta tata letak langkah konfirmasi pada `sambung-fe/features/offers/components/offer-wizard.tsx`.
- **Hardening Privasi & Sinkronisasi Backend** (`55c8da2`):
  - Menambahkan `maskPhone()` untuk tampilan admin (`admin.service.ts`, `contracts.service.ts`), modul `offer-moderation.ts` (`[Catatan Pengawas]:` di `Offer.notes`), sinkronisasi dinamis `fairPriceToleranceDelta` dari `SystemParameter`, perbaikan validasi Zod/error handler, serta ekspansi `notifications-admin.test.mjs`.
- **Stabilitas Sesi, UX Admin, & Kompatibilitas React 19 / Next 16** (`b5536b2`):
  - Menambahkan `role-routes.ts`, `auth-aware-link-button.tsx`, dan `use-redirect-authenticated.ts` untuk persistensi/redirect sesi aktif, memperbarui `theme-provider.tsx`, `use-mobile.ts`, halaman admin, simulasi harga wajar, dan negosiasi.

### Changed
- **Penyesuaian Halaman Publik** (`a84a75b`, `4b4f736`, `984151c`):
  - Menghapus halaman publik terpisah `sambung-fe/app/(public)/kalkulator/page.tsx`.

---

## [2026-11-26]

### Added
- **Inisialisasi Monorepo & Backend Fase 1–4** (`0bdfdc6` .. `6fa1530`):
  - `8369ebb`: Struktur modular Express 5, TypeScript, Prisma ORM, PostgreSQL.
  - `f59a62b`: Modul `auth` (OTP demo, cookie `sambung_session`, registrasi akun, migrasi `001_identity`).
  - `562c9e8`, `575a077`: Modul `pricing` (Gradio AI v3 + fallback JSON), `offers`, `catalog`, `Region` seed, migrasi `002_offers_pricing_catalog`.
  - `b3d52d1`: Modul `contracts` (pesanan parsial, penguncian baris `FOR UPDATE`, negosiasi berversi, tenggat kedaluwarsa, migrasi `003_contracts_negotiation`).
  - `ed93025`, `6fa1530`: Modul `forecast` (2w/4w + TreeSHAP), `notifications`, `admin` (statistik, parameter sistem, audit log, moderasi), migrasi `004_notifications_and_admin`.
- **Frontend Next.js 16 & Integrasi Fitur** (`b298b84` .. `fe0893c`):
  - `b298b84`, `235e677`: Inisialisasi App Router, Tailwind 4, shadcn UI, dan alur login/daftar OTP.
  - `ff63e24`, `4c80e6f`, `a7744af`: Wizard tawaran petani (plus deteksi unsaved changes & kadar air di `fe0893c`), katalog & pesanan parsial pembeli, ruang negosiasi & bukti kesepakatan cetak.
  - `563d273`, `2bf127a`, `747c651`, `70a2fa5`: Halaman prakiraan AI & TreeSHAP, notifikasi polling TanStack Query, portal admin, papan rantai pasok 4-tier, peta disparitas 34 provinsi, dan kalkulator publik.
  - `c5f027b`, `2605f48`: Konfigurasi `output: "standalone"` di `next.config.ts` dan pembaruan komprehensif `README.md` monorepo/BE/FE.
