# SAMBUNG Frontend (`sambung-fe`)

Frontend antarmuka web modern untuk **SAMBUNG — Platform Transaksi Gabah Digital Berkeadilan**. Dibangun menggunakan Next.js 16 (App Router dengan Turbopack), TypeScript, Tailwind CSS, shadcn/ui, dan TanStack Query.

---

## 1. Prasyarat Lingkungan

- **Node.js**: `>= 20.0.0` (direkomendasikan Node 22 atau 24)
- **Package Manager**: `pnpm` (versi `12.15.0`)

---

## 2. Pengaturan Konfigurasi Lingkungan (`.env.local`)

Buat berkas `.env.local` pada direktori `sambung-fe/`:

```env
# Sumber data: 'false' untuk backend Express nyata (termasuk saat demo FE), 'true' untuk mock lokal
NEXT_PUBLIC_USE_MOCK=false

# Mode FE: 'demo' (tampilkan elemen bantu demo & OTP demo) atau 'live' (tanpa elemen demo & OTP WhatsApp)
NEXT_PUBLIC_FE_MODE=live

# Alamat URL Backend Express (dipakai saat NEXT_PUBLIC_USE_MOCK=false)
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

> **Panduan Akses dari Ponsel / Perangkat Fisik Kedua:**
> Jika menguji aplikasi dari ponsel di jaringan WiFi yang sama, ubah `localhost` pada `NEXT_PUBLIC_API_BASE_URL` menjadi alamat IP lokal laptop Anda (contoh: `NEXT_PUBLIC_API_BASE_URL=http://192.168.1.10:4000`).

---

## 3. Langkah Instalasi & Menjalankan Aplikasi

Jalankan perintah berikut:

```powershell
# 1. Pasang dependensi
pnpm install

# 2. Periksa kesesuaian tipe data TypeScript
pnpm typecheck

# 3. Jalankan server pengembangan (Turbopack)
pnpm dev
```

Buka peramban pada alamat [http://localhost:3000](http://localhost:3000).

Untuk memeriksa kesiapan rilis produksi:

```powershell
# Build produksi
pnpm build

# Menjalankan hasil build produksi
pnpm start
```

---

## 4. Alur Autentikasi & Akun Demo

Aplikasi menggunakan alur autentikasi nomor ponsel OTP demo (tersedia kode petunjuk di layar saat mode demo aktif) dan form login admin:

| Pengguna | Peran | Akses Masuk | Halaman Utama |
|---|---|---|---|
| **Sari** | Petani | Ponsel: `081234567890` (masuk via `/masuk`) | `/petani` (Kelola tawaran, jual panen) |
| **Budi** | Pembeli | Ponsel: `081398765432` (masuk via `/masuk`) | `/pembeli` (Katalog pasar, pesan gabah) |
| **Rina** | Pembeli | Ponsel: `081398765433` (masuk via `/masuk`) | `/pembeli` (Uji persaingan stok) |
| **Admin** | Pengawas | Email: `admin@sambung.id` / Kata sandi: `admin123` (masuk via `/admin/masuk`) | `/admin` (Pusat kendali & tata kelola) |

---

## 5. Struktur Arsitektur Frontend

Aplikasi mengikuti arsitektur modular berbasis fitur (*Feature-driven Architecture*):

```
sambung-fe/
├── app/                        # Next.js App Router (Halaman & Perutean)
│   ├── (auth)/                 # Alur login OTP, verifikasi, & registrasi
│   ├── (public)/               # Beranda umum, bantuan, kalkulator harga, peta
│   ├── (workspace)/            # Ruang kerja pengguna terautentikasi
│   │   ├── petani/             # Dasbor petani, form jual panen, daftar tawaran
│   │   ├── pembeli/            # Dasbor pembeli & katalog pasokan gabah
│   │   ├── kontrak/            # Ruang negosiasi interaktif & lembar bukti kesepakatan
│   │   ├── prakiraan/          # Prakiraan tren harga AI 2w/4w & faktor TreeSHAP
│   │   ├── notifikasi/         # Pusat pemberitahuan transaksi dinamis (polling)
│   │   ├── harga/              # Papan perbandingan rantai pasok 4-tier
│   │   └── peta/               # Peta & tabel disparitas spasial 34 provinsi
│   └── admin/                  # Portal pengawas & tata kelola sistem
├── features/                   # Modul Domain & Layanan Terisolasi
│   ├── auth/                   # Skema akun, hook useAuth, & sesi cookie
│   ├── offers/                 # Form wizard tawaran panen & manajemen draf/terbit
│   ├── catalog/                # Pencarian katalog & form pemesanan parsial
│   ├── contracts/              # State machine negosiasi, hook transaksi, & aksi kontrak
│   ├── forecast/               # Service prakiraan harga AI v3 & hook useForecast
│   ├── notifications/          # Service & hook notifikasi transaksi terintegrasi
│   ├── admin/                  # Hook pemantauan statistik, kalibrasi parameter, log audit
│   ├── price-check/            # Validasi lampu harga (hijau/kuning/merah)
│   ├── price-board/            # Kalkulasi rantai pasok 4-tier & perbandingan margin
│   └── region-map/             # Komponen peta vektor SVG Indonesia & tabel provinsi
├── components/                 # Komponen UI dasar shadcn & tata letak bersama (AppShell)
└── lib/                        # apiClient (HTTP Fetch wrapper), utils, & query-client
```

---

## 6. Fitur Unggulan

1. **Prakiraan Harga Cerdas AI & TreeSHAP (`/prakiraan`)**: Menampilkan proyeksi harga beras produsen (Medium I) dan turunan gabah untuk 2 & 4 pekan ke depan dari layanan AI v3 live Hugging Face, lengkap dengan visualisasi faktor pendorong (cuaca ERA5, kebijakan, pasokan).
2. **Pemesanan Parsial & Negosiasi Berversi (`/kontrak/[id]`)**: Pembeli dapat memesan sebagian kuota panen dan menawar harga. Backend mengunci stok dan menolak pengajuan harga lama (*version conflict*).
3. **Notifikasi Transaksi Dinamis (`/notifikasi`)**: Otomatis memperbarui pesan transaksi setiap 10 detik saat lawan bertransaksi dari perangkat lain.
4. **Portal Pengawas Dinamis (`/admin`)**: Memantau statistik agregat pasar, mengkalibrasi parameter tenggat jam secara dinamis, dan meninjau log audit sistem.
5. **Surat Bukti Kesepakatan Simulasi (`/kontrak/[id]/bukti`)**: Format dokumen kesepakatan siap cetak/PDF setelah kedua belah pihak mengonfirmasi penyelesaian.
