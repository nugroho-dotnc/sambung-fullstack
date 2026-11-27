# Changelog

Semua perubahan penting pada proyek **SAMBUNG** (`sambung-be` dan `sambung-fe`) dicatat di berkas ini mengikuti format [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

> **Aturan Agent**: Setiap perubahan kode, skema database, konfigurasi, atau aset data **wajib** ditambahkan ke bagian `## [Unreleased]` sebelum tugas selesai.

---

## [Unreleased]

### Added
- **Frontend (`sambung-fe`) — Tipografi Tanda Tangan Digital (Alex Brush Font)**:
  - Mengonfigurasi font kaligrafi lokal `AlexBrush-Regular.ttf` pada `sambung-fe/app/fonts/`, `layout.tsx`, dan `globals.css` dengan token `--font-signature` serta utility class `font-signature`.
  - Menerapkan font Alex Brush pada pratinjau ketik tanda tangan di dialog (`signature-dialog.tsx`) dan tampilan lembar kesepakatan digital / cetak PDF (`bukti/page.tsx`).
- **Frontend (`sambung-fe`) — Komponen Perjalanan Kontrak Terpadu (`ContractTimeline`)**:
  - Menambahkan `sambung-fe/features/contracts/components/contract-timeline.tsx` dan mengintegrasikannya ke `negotiation-room.tsx` menggantikan riwayat chat statis.
  - Menampilkan alur sekuensial lengkap: Pesanan Diajukan $\rightarrow$ Histori Tawar Balik $\rightarrow$ Harga Disepakati $\rightarrow$ Tanda Tangan Petani & Pembeli $\rightarrow$ Pengiriman $\rightarrow$ Penerimaan Selesai (atau status Pembatalan) dengan icon Lucide murni tanpa emotikon sesuai referensi visual.

### Changed
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
