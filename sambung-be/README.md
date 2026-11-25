# SAMBUNG BE — fase 1

Gunakan Node 24, pnpm 12.23.0, dan database PostgreSQL khusus demo. Dari folder sambung-be jalankan:

```powershell
pnpm install --frozen-lockfile
Copy-Item .env.example .env
```

Isi DATABASE_URL di .env dengan alamat, pengguna, kata sandi dan nama database uji yang sudah dibuat. Salin contoh konfigurasi hanya saat .env belum ada. Atur FE_ORIGIN sesuai alamat browser. OTP_MODE=demo mengaktifkan kode sementara yang terlihat di browser; jalankan server ini hanya di lingkungan demo terisolasi.

```powershell
pnpm generate
pnpm seed:demo
pnpm typecheck
pnpm build
pnpm start
```

Seed menjalankan migrasi terlebih dahulu dan mempertahankan akun yang sudah ada. Untuk migrasi saja gunakan `pnpm migrate`. Untuk pengembangan gunakan `pnpm dev`. Health tersedia di `GET /health`.

### Database fase 1 yang sudah berisi akun

Untuk database lama, sebelum menjalankan seed atau deploy, bandingkan skema aktual dengan prisma/schema.prisma.
Jalankan dari PowerShell dengan DATABASE_URL menunjuk ke database yang sedang diperiksa:

```powershell
pnpm exec prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --exit-code
```

Kode keluar 0 berarti struktur yang dikenali Prisma cocok. Periksa juga bahwa schema_migration berisi 001_identity dan constraint CHECK peran serta status sesuai SQL awal. Jika terdapat selisih, tinjau dahulu. Setelah cocok, catat baseline **sekali** dengan `pnpm exec prisma migrate resolve --applied 001_identity`. Langkah ini mencatat riwayat Prisma tanpa membuat ulang akun atau sesi. Untuk database baru yang kosong cukup gunakan seed:demo seperti di atas.

### Struktur fase 1

- `src/modules/auth/` memuat route, schema Zod, service autentikasi, dan helper sesi.
- `src/db/prisma.ts` membuat client bersama. Konfigurasi startup ada di `src/config/env.ts`.
- `src/shared/api-error.ts` dan `src/middleware/error-handler.ts` menjaga format respons galat.
- `prisma/schema.prisma` memetakan tabel lama. Migrasi selanjutnya masuk ke `prisma/migrations/`; seed demo ada di `prisma/seed.ts`.

Pada sambung-fe, isi .env.local dengan NEXT_PUBLIC_USE_MOCK=false dan NEXT_PUBLIC_API_BASE_URL=http://localhost:4000. Mulai ulang Next.js dan buka http://localhost:3000/masuk. Untuk HP, ganti localhost pada kedua alamat dan FE_ORIGIN dengan IP laptop yang sama, pertahankan port masing-masing, lalu jalankan ulang kedua aplikasi.

| Nomor | Nama | Peran |
|---|---|---|
| 081234567890 | Sari | Petani |
| 081398765432 | Budi | Pembeli |
| 081398765433 | Rina | Pembeli |

Masuk dari dua profil browser, lihat kode demo empat digit pada halaman verifikasi, lalu muat ulang halaman. Keluar dari satu sesi dan pastikan sesi lainnya masih aktif. Nomor baru diarahkan ke pendaftaran setelah lolos verifikasi. Modul transaksi dan login admin berada di luar fase ini.

Uji regresi API dengan pnpm test:auth setelah mengisi TEST_DATABASE_URL dengan database khusus uji yang telah dimigrasikan. Pengujian membuat akun uji dengan nomor acak.

### Fase 2 — tawaran, acuan harga, dan katalog

Jalankan backend dari sambung-be agar path snapshot sesuai. Dengan FE dalam mode API, masuk sebagai Sari, buat draf 1.000 kg di Sumbersari, lalu tinjau dan terbitkan. Masuk sebagai Budi di profil browser atau perangkat lain dan buka katalog. Cocokkan volume dan harga, tarik tawaran dari akun Sari, lalu muat ulang detail katalog Budi.

Backend memakai Gradio untuk menghitung rentang harga. AI_BASE_URL dapat mengganti alamat server. AI_TIMEOUT_MS mengatur batas waktu. Jika AI_SNAPSHOT_PATH terisi dan layanan gagal, hasil dari snapshot wilayah yang sama mencantumkan tanggal sumber. Tanpa sumber yang dapat digunakan, publikasi mengembalikan PRICE_UNAVAILABLE dan draf dapat dibuka kembali.

Gunakan database PostgreSQL khusus pengujian dengan nama berakhiran _test. Jalankan migrasi pada database tersebut, lalu isi TEST_DATABASE_URL untuk sesi pengujian. Jalankan kedua suite dengan pnpm test:phase2. Uji memakai dua peran dan server harga lokal dengan respons yang dikendalikan.

### Fase 3 — kontrak parsial dan negosiasi

Jalankan migrasi dengan pnpm migrate lalu mulai ulang API dan frontend. Proses API memeriksa kontrak lewat tenggat saat startup dan setiap lima detik. Tenggat berlangsung 24 jam dari waktu pengajuan dan server memeriksa tenggat lagi saat pengguna bertindak.

1. Sari menerbitkan tawaran 1.000 kg. Dari sesi lain Budi membuka katalog dan memesan 300 kg dengan harga Rp6.500/kg.
2. Sari membuka daftar kontrak, memilih pesanan Budi dan mengajukan Rp6.800/kg. Budi membuka ruang yang sama dan menyetujui harga aktif. Verifikasi 700 kg masih tersedia, dan kontak baru muncul pada status disetujui.
3. Sari mengonfirmasi selesai, kemudian Budi mengonfirmasi dari perangkat kedua. Buka bukti simulasi dan periksa volume 300 kg, harga akhir, serta sumber acuan.
4. Pada pesanan lain, coba penolakan atau pembatalan dan periksa kembali ketersediaan stok. Gunakan pnpm test:phase3 dengan TEST_DATABASE_URL mengarah ke database uji yang berakhiran _test dan sudah dimigrasikan untuk pengujian persaingan stok, tenggat serta pengulangan permintaan.
