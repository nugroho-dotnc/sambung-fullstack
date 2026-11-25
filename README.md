# SAMBUNG Fullstack — Platform Transaksi Gabah Digital Berkeadilan

Repositori monorepo resmi untuk **SAMBUNG**, platform pertukaran komoditas gabah digital antara **Petani** dan **Pembeli / Penggilingan** berbasis acuan harga wajar dan kecerdasan pasar AI (*AI Price Intelligence*).

---

## 1. Arsitektur Repositori

Proyek ini terbagi menjadi dua komponen utama:

```
sambung-fullstack/
├── sambung-be/       # Backend REST API (Express 5, TypeScript, Prisma ORM, PostgreSQL)
├── sambung-fe/       # Frontend Web App (Next.js 16 App Router, Tailwind, TanStack Query)
└── docs/             # Dokumentasi spesifikasi, kontrak API, ERD, dan panduan harga
```

---

## 2. Panduan Cepat Menjalankan Sistem (*Quick Start*)

### A. Persiapan Backend (`sambung-be`)

Buka terminal pertama di direktori `sambung-be`:

```powershell
cd sambung-be

# 1. Pasang dependensi
pnpm install

# 2. Siapkan file konfigurasi lingkungan (.env)
Copy-Item .env.example .env
# (Pastikan DATABASE_URL menunjuk ke database PostgreSQL Anda)

# 3. Bangun Prisma Client & migrasikan database
pnpm generate
pnpm migrate

# 4. Terapkan data awal (seed akun demo & parameter pasar)
pnpm seed:demo

# 5. Jalankan server backend (port 4000)
pnpm dev
```

Backend aktif di `http://localhost:4000`.

---

### B. Persiapan Frontend (`sambung-fe`)

Buka terminal kedua di direktori `sambung-fe`:

```powershell
cd sambung-fe

# 1. Pasang dependensi
pnpm install

# 2. Siapkan file konfigurasi lingkungan (.env.local)
# Pastikan NEXT_PUBLIC_USE_MOCK=false dan NEXT_PUBLIC_API_BASE_URL=http://localhost:4000

# 3. Jalankan server frontend (port 3000)
pnpm dev
```

Buka peramban di [http://localhost:3000](http://localhost:3000).

---

## 3. Akun Demo Bawaan untuk Pengujian

| Peran | Nama | Nomor Telepon / Email | Kredensial | Fungsi Pengujian |
|---|---|---|---|---|
| **Petani** | Sari | `081234567890` | Kode OTP demo di layar | Menerbitkan tawaran panen, tawar-menawar, konfirmasi selesai |
| **Pembeli** | Budi | `081398765432` | Kode OTP demo di layar | Memesan volume parsial dari katalog, menawar harga, konfirmasi selesai |
| **Pembeli** | Rina | `081398765433` | Kode OTP demo di layar | Uji pemesanan konkuren berebut sisa kuota pasokan |
| **Admin** | Pengawas Sistem | `admin@sambung.id` | Kata Sandi: `admin123` | Portal pengawasan, kalibrasi parameter pasar, audit log |

---

## 4. Panduan Pengujian Dua Perangkat Fisik (Laptop + HP / WiFi Lokal)

Agar dua pengguna dapat berinteraksi secara *live* dari perangkat berbeda:

1. **Cari Tahu Alamat IP Lokal Laptop Anda:**
   - Jalankan `ipconfig` di PowerShell. Temukan alamat `IPv4 Address` (contoh: `192.168.1.10`).
2. **Sesuaikan Konfigurasi Backend (`sambung-be/.env`):**
   - Atur: `FE_ORIGIN=http://192.168.1.10:3000`
3. **Sesuaikan Konfigurasi Frontend (`sambung-fe/.env.local`):**
   - Atur: `NEXT_PUBLIC_API_BASE_URL=http://192.168.1.10:4000`
4. **Jalankan Ulang Server:**
   - Jalankan backend: `pnpm dev`
   - Jalankan frontend dengan bind host: `pnpm dev -- -H 0.0.0.0`
5. **Akses dari Ponsel:**
   - Buka peramban di ponsel Anda yang terhubung ke WiFi yang sama, lalu akses: `http://192.168.1.10:3000`.

---

## 5. Ringkasan Fitur Unggulan

- **Identitas & Sesi Aman**: Autentikasi nomor ponsel dengan verifikasi OTP dan proteksi cookie `httpOnly`.
- **Tawaran & Validasi Harga Wajar**: Evaluasi lampu harga (hijau, kuning, merah) berbasis acuan wilayah PIHPS dan Bapanas.
- **Katalog & Pemesanan Parsial**: Pembeli dapat memesan sebagian kuota dari tawaran panen petani dengan penguncian baris konkuren (*row-level locking*).
- **Ruang Negosiasi Dinamis**: Alur tawar balik harga berversi dengan proteksi benturan versi (*version conflict prevention*).
- **Prakiraan AI v3 & TreeSHAP**: Prediksi harga produsen 2 & 4 pekan ke depan menggunakan model Machine Learning Bagged3 Hurdle-LightGBM yang lolos evaluasi *walk-forward*.
- **Pemberitahuan Transaksi Real-time**: Notifikasi otomatis saat lawan transaksi memesan, menawar balik, menyetujui, atau mengonfirmasi.
- **Portal Pengawas (Admin Governance)**: Dasbor statistik pasar gabah terintegrasi, kalibrasi dinamis tenggat kedaluwarsa pesanan, dan jejak audit sistem.
- **Surat Bukti Digital (SIMULASI)**: Lembar kesepakatan digital resmi dengan format cetak/PDF setelah kedua belah pihak menyelesaikan transaksi.
