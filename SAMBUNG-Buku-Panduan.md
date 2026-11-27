# Buku Panduan Pengguna SAMBUNG

**Tim 23.58 · Hackathon Ketahanan Pangan · Digitalisasi AI Bidang Ketahanan Pangan**

**Cakupan panduan** — MVP 16–26 November 2026. Langkah di buku ini merujuk pada versi web sampai 26 November. Beberapa tangkapan layar berasal dari versi sesudahnya. Keterangan gambar menjelaskan bagian yang dapat dipakai sebagai rujukan.

## Daftar isi

1. [Pengantar SAMBUNG](#1-pengantar-sambung)
2. [Memulai](#2-memulai)
3. [Warga](#3-warga)
4. [Petani](#4-petani)
5. [Pembeli](#5-pembeli)
6. [Memahami harga wajar, prakiraan, dan penjelasan prediksi](#6-memahami-harga-wajar-prakiraan-dan-penjelasan-prediksi)
7. [Memeriksa kontrak](#7-memeriksa-kontrak)
8. [Pemecahan masalah](#8-pemecahan-masalah)
9. [Pertanyaan yang sering diajukan](#9-pertanyaan-yang-sering-diajukan)
10. [Glosarium](#10-glosarium)
11. [Lampiran](#lampiran)

## 1. Pengantar SAMBUNG

SAMBUNG membantu Petani mencari calon pembeli gabah dan menyiapkan harga untuk berunding. Penggilingan atau pengolah memakai akun Pembeli untuk mencari pasokan, memesan gabah, dan mengajukan harga. Buka SAMBUNG lewat peramban di ponsel atau komputer.

**Harga wajar dan prakiraan adalah perkiraan. SAMBUNG tidak menjamin harga jual atau beli.** Harga wajar memberi rentang acuan berdasarkan data pasar. Prakiraan menggambarkan kemungkinan harga dua atau empat pekan mendatang, seperti ramalan cuaca yang membantu Anda menyiapkan rencana. Ketepatannya bergantung pada data yang tersedia, kesesuaian wilayah dan jenis gabah, serta perubahan kondisi pasar.

Pada MVP ini, Petani dan Pembeli menjalankan **transaksi simulasi**. Anda dapat mencatat pesanan, berunding, menyepakati harga, dan mengonfirmasi penyelesaian. Status selesai menunjukkan bahwa kedua pihak telah menuntaskan simulasi.

### ATURAN PERILAKU

- Gunakan langkah yang didukung SRS, arsitektur informasi, glosarium, catatan keputusan, tangkapan layar, atau kode pada batas MVP.
- Ikuti label tombol dan menu yang terlihat pada versi yang dipakai. Bila label atau alurnya berbeda antarsumber, lihat catatan verifikasi di Lampiran C.
- **[PERLU DIVERIFIKASI]** menandai perilaku yang belum dapat dipastikan. Jika ada saran untuk menuntaskannya, saran dicatat sebagai **Usulan** di lampiran.
- Baca harga per kilogram, volume, dan status terakhir sebelum mengirim atau menyetujui tindakan. Jaga kerahasiaan kode verifikasi akun.

## 2. Memulai

### Masuk dengan nomor ponsel

1. Buka halaman SAMBUNG. Ketuk **Masuk**.
2. Isi **Nomor Ponsel**, lalu ketuk **Lanjutkan Verifikasi**.
3. Di halaman **Verifikasi Nomor**, isi **Kode 4-Digit**. Kode ini disebut OTP, yaitu kode sekali pakai seperti kunci sementara untuk membuka akun. Pada versi demo, gunakan petunjuk kode yang muncul di layar jika tersedia.
4. Ketuk **Konfirmasi & Masuk**. Jika akun sudah terdaftar, SAMBUNG membuka **Beranda Petani** atau **Dasbor Pembeli** sesuai peran akun.

[GAMBAR: Tampilan ponsel untuk Nomor Ponsel dan Kode 4-Digit pada versi MVP 26 November.]

### Daftar dan pilih peran

1. Ikuti langkah verifikasi nomor di atas. Jika nomor belum terdaftar, formulir pendaftaran akan terbuka.
2. Di **Pilih Peran Akun Anda**, pilih peran yang sesuai. Pilih **Petani / Kelompok Tani** untuk menjual panen, atau **Pembeli / Penggilingan** untuk mencari dan memesan gabah.
3. Isi nama penanggung jawab, provinsi, kabupaten atau kota, dan kecamatan. Nama kelompok tani atau usaha penggilingan boleh diisi.
4. Baca **Ketentuan Layanan & Kebijakan Data SAMBUNG**. Centang persetujuan jika Anda setuju.
5. Ketuk **Selesaikan Pendaftaran & Masuk**. Periksa apakah ruang kerja yang terbuka sesuai dengan peran Anda.

[GAMBAR: Formulir pendaftaran dengan dua pilihan peran pada versi MVP.]

## 3. Warga

Anda dapat membuka **Beranda** tanpa akun untuk mengenal SAMBUNG. Gunakan **Peta & Papan Harga** untuk melihat informasi harga publik dan **Bantuan** untuk membaca keterangan layanan. Ketuk **Masuk** jika Anda ingin menjual atau memesan gabah sebagai pengguna terdaftar.

**[PERLU DIVERIFIKASI]** SRS dan arsitektur informasi mencantumkan acuan dan prakiraan sebagai informasi publik. Menu dan rute pada kode 26 November menempatkan kedua halaman tersebut di ruang kerja yang memerlukan akun. Langkah yang terkonfirmasi untuk versi itu ada di Bab 6.

[GAMBAR: Beranda publik di ponsel yang menampilkan pilihan Masuk dan navigasi publik versi MVP.]

## 4. Petani

### Pasang tawaran panen

1. Di **Beranda Petani**, ketuk **Jual Hasil Panen Baru**.
2. Pada tahap **Detail**, pilih **Jenis Gabah**. Isi **Volume Bersih (kg)**, **Lokasi Pengambilan (Kecamatan)**, dan harga minta per kilogram. Isi **Estimasi Mutu / Kadar Air (%)** jika sudah diukur. Biarkan kolom itu kosong jika belum diukur. Isi **Tanggal Panen / Siap Angkut** jika sudah diketahui.
3. Baca warna dan alasan pada lampu harga. Jika merah, periksa kembali angka atau baca peringatan sebelum mengonfirmasi pilihan Anda. Lihat Bab 6 untuk arti setiap warna.
4. Ketuk **Lanjut Tinjau**. Cocokkan jenis, lokasi, volume, dan harga per kilogram dengan rencana Anda. Gunakan **Simpan Draf** jika hendak melanjutkan nanti.
5. Ketuk **Terbitkan**. Jika muncul tulisan **Tawaran Panen Berhasil Diterbitkan**, buka **Tawaran Saya** untuk melihat hasilnya. Tawaran terbit dengan volume tersedia dapat dipesan dari katalog.

![Layar ponsel pada tahap Tinjau, menampilkan jenis, volume, dan catatan mutu.](SAMBUNG-panel-capture/mobile/F07-ringkasan-siap-terbit-bagian-atas.png)

*Contoh tampilan tahap Tinjau. Angka pada gambar mengikuti data contoh.*

**[PERLU DIVERIFIKASI]** Jika wilayah atau jenis gabah belum punya acuan, SRS mengizinkan tawaran tetap terbit. Pada kode 26 November, tombol tinjau dapat berhenti jika layanan pemeriksaan harga gagal. Jika ini terjadi, simpan draf bila tombolnya tersedia dan baca pesan yang muncul. Lihat Lampiran C.

### Tanggapi pesanan masuk

1. Buka **Kontrak & Kesepakatan** dan pilih pesanan berstatus **Menunggu Kesepakatan**.
2. Periksa jenis gabah, volume, harga terbaru per kilogram, dan batas waktu tanggapan. Baca **Histori Penawaran & Negosiasi Harga** jika pernah ada tawaran balik.
3. Saat muncul **Giliran Anda Bertindak**, pilih tindakan yang sesuai.
   - Ketuk **Setujui** dengan harga yang tertera jika harganya cocok.
   - Ketuk **Nego Harga** untuk mengajukan harga lain. Periksa lampu harga sebelum mengirim. Pembeli mendapat giliran berikutnya.
   - Ketuk **Tolak pesanan** dan isi alasan jika pesanan tidak dapat Anda penuhi.
4. Jika harga diterima, status berubah menjadi **Disetujui Bersama**. Lanjutkan ke [cara menyelesaikan simulasi](#selesaikan-simulasi-bersama).

![Ruang Kesepakatan di ponsel, dengan tenggat, giliran, jenis gabah, volume, dan harga terkini.](SAMBUNG-panel-capture/mobile/F12-tawaran-masuk-petani-bagian-atas.png)

*Contoh tampilan pesanan yang masih menunggu. Gunakan tenggat pada pesanan Anda.*

## 5. Pembeli

Pembeli adalah penggilingan atau pengolah yang mencari gabah. Nama ruang kerja pada versi 26 November adalah **Dasbor Pembeli**. Versi sesudah batas MVP memakai **Dasbor Produsen**. Perbedaan istilah ada di Lampiran C.

### Cari pasokan dan kirim pesanan

1. Buka **Katalog Pasokan**. Gunakan pilihan jenis gabah dan wilayah jika perlu.
2. Buka tawaran yang sesuai. Periksa jenis, lokasi, harga minta, volume tersedia, dan kadar air jika tercatat.
3. Masukkan jumlah yang ingin dipesan dalam kilogram. Anda dapat memesan sebagian atau seluruh volume tersedia. Misalnya, dari tawaran 1.000 kg Anda dapat memesan 400 kg. Sistem mencadangkan 400 kg saat pesanan berhasil diajukan. Sisa 600 kg masih dapat dipesan, selama belum ada pesanan lain.
4. Gunakan harga minta Petani atau ajukan harga Anda sendiri. Baca lampu harga, lalu periksa kembali **Ringkasan Nilai Pesanan**.
5. Centang pernyataan komitmen jika volume dan harga sudah sesuai. Ketuk **Kirim Pesanan**. Pada tampilan lebar tombolnya bertuliskan **Kirim Permintaan Pesanan**.
6. Pastikan pesanan tampil di **Kontrak & Kesepakatan** dengan status **Menunggu Kesepakatan**. Selama menunggu, pantau tanggapan Petani dan batas waktunya.

![Formulir pesanan di ponsel, menampilkan pasokan tersedia dan isian volume pesanan.](SAMBUNG-panel-capture/mobile/F10-formulir-pembeli-bagian-atas.png)

*Contoh formulir untuk memesan sebagian pasokan.*

### Tanggapi harga balik atau batalkan pesanan

1. Buka pesanan yang sama di **Kontrak & Kesepakatan**.
2. Jika Petani mengajukan harga balik, periksa harga aktif dan total terbaru. Pada giliran Anda, ketuk **Setujui** untuk menerima harga yang ditampilkan, atau **Nego Harga** untuk mengusulkan harga lain.
3. Jika pesanan masih menunggu dan Anda perlu membatalkannya, ketuk **Batalkan pesanan** dan isi alasan. Periksa bahwa status berganti menjadi **Dibatalkan**.
4. Setelah status **Disetujui Bersama**, ikuti langkah penyelesaian pada Bab 7.

## 6. Memahami harga wajar, prakiraan, dan penjelasan prediksi

**Harga wajar dan prakiraan adalah perkiraan. Harga saat transaksi dapat berbeda.** Periksa wilayah, jenis gabah, tanggal pembaruan, dan ketersediaan data setiap kali membaca hasil.

### Cek dan baca harga wajar

1. Dari ruang kerja, buka **Acuan Harga Wajar**.
2. Di bagian **Atur Parameter Acuan Gabah**, pilih **Komoditas Gabah**. GKP berarti Gabah Kering Panen, sedangkan GKG berarti Gabah Kering Giling. Pilih provinsi yang sesuai untuk **Wilayah Pengamatan**.
3. Baca **Rentang Harga Wajar Rekomendasi**. Angka pertama adalah batas bawah. Angka kedua adalah batas atas. Keduanya dalam rupiah per kilogram (Rp/kg).
4. Periksa sumber dan tanggal data bila tampil. Gunakan rentang itu untuk membandingkan harga minta atau harga pesanan. Untuk keputusan pada formulir transaksi, baca acuan dan alasan lampu yang tampil pada formulir tersebut.

Bayangkan 100 kg gabah masuk ke penggilingan. Jika hasilnya 53 kg beras, rendemennya 53%. SAMBUNG memperkirakan rentang melalui harga beras di tingkat penggilingan, rendemen, dan perbandingan harga gabah dengan beras pada data pasar sebelumnya. Kesesuaian wilayah, jenis gabah, umur data, dan ketepatan rendemen memengaruhi seberapa dekat angka acuan dengan kondisi Anda. Kadar air yang dicatat pada tawaran memberi informasi mutu kepada Pembeli. Persentase itu tidak mengubah rentang secara otomatis.

![Contoh di ponsel dengan batas bawah, batas atas, satuan per kilogram, dan lampu harga.](SAMBUNG-panel-capture/mobile/F03-harga-gkp-jawa-timur-bagian-tengah.png)

*Contoh letak rentang. Baca angka dan tanggal data yang tampil untuk pilihan Anda.*

| Lampu | Arti | Tindakan |
| --- | --- | --- |
| Hijau | Harga berada dalam rentang. | Cocokkan dengan kondisi gabah dan rencana Anda. |
| Kuning | Harga sedikit di bawah batas bawah atau berada di atas batas atas. | Baca alasan untuk mengetahui posisinya. |
| Merah | Harga berada jauh di bawah batas bawah. | Periksa nominal. Jika tetap memilihnya, beri konfirmasi ketika sistem memintanya. |
| Acuan belum tersedia | Data pembanding untuk pilihan itu belum tersedia. | Periksa jenis dan wilayah. Baca pesan pada formulir jika pengajuan tertahan. |

### Baca prakiraan dua atau empat pekan

1. Buka **Prakiraan Tren AI** dari ruang kerja.
2. Pilih provinsi yang ingin Anda lihat. Ketuk **Horizon 2 Pekan** atau **Horizon 4 Pekan**.
3. Baca wilayah dan tanggal di bagian **Sasaran**. Bedakan perkiraan harga beras di tingkat penggilingan dari **estimasi turunan gabah**. GKP dan GKG dihitung dari perkiraan beras dengan rendemen masing-masing.
4. Jika ada grafik, bedakan garis harga yang telah tercatat dari garis perkiraan. Jika tampil **Rentang Perkiraan Wajar (80%)**, baca kedua batasnya untuk melihat seberapa lebar ketidakpastian pada perkiraan beras. Harga bisa berada di luar rentang. Angka 80% tersebut tidak otomatis berlaku untuk estimasi gabah.
5. Jika yang tampil **Acuan Pekan Terakhir**, baca angka itu sebagai rujukan dari pekan sebelumnya. Beberapa wilayah menampilkan acuan ini ketika prakiraan AI belum tersedia. Rincian faktor bisa kosong.

Prakiraan memakai **model**, yaitu cara komputer mengenali pola dari data sebelumnya, seperti pedagang yang mengingat perubahan harga dari pekan ke pekan. Ketepatan perkiraan dipengaruhi oleh banyaknya data wilayah, waktu pembaruannya, jangka waktu yang dipilih, dan perubahan cuaca, panen, atau pasokan yang belum terlihat dalam data. Perkiraan gabah juga bergantung pada rendemen yang digunakan.

![Layar ponsel yang memperlihatkan pemilihan provinsi, pilihan dua dan empat pekan, dan tanggal sasaran.](SAMBUNG-panel-capture/mobile/F04-prakiraan-2-pekan-bagian-atas.png)

*Contoh letak pilihan wilayah, waktu, dan tanggal sasaran.*

### Baca alasan di balik angka

1. Pada halaman yang sama, gulir ke **Faktor Penggerak Harga**.
2. Baca arah dan keterangan setiap faktor. Tanda **+** berarti faktor itu mendorong angka perkiraan naik. Tanda **−** berarti faktor itu menekan angka perkiraan.
3. Gunakan penjelasan itu sebagai bahan pertimbangan. Misalnya, jika cuaca terlihat bertanda **+**, artinya pola cuaca dalam data mendorong perkiraan beras ke atas. Harga di pasar tetap dapat bergerak ke arah lain.

**SHAP** adalah cara menjelaskan sumbangan tiap faktor terhadap angka yang dihitung komputer. Bayangkan Anda menelusuri mengapa hasil timbangan berubah setelah isi keranjang ditambah dan sebagian isinya diambil. SHAP menunjukkan faktor mana yang menggeser angka awal ke atas atau ke bawah. Tanda itu menjelaskan hitungan model beras. Tanda itu tidak membuktikan penyebab perubahan harga di pasar. Jika tertulis **Rincian Faktor Belum Tersedia**, baca keterangan metode pada hasil tersebut. Anda dapat memeriksa pilihan wilayah atau jangka waktu lain.

![Contoh faktor cuaca, tren harga, musim, dan pasokan, dengan tanda yang menunjukkan arah kontribusi.](SAMBUNG-panel-capture/mobile/F04-prakiraan-4-pekan-bagian-bawah.png)

*Besaran dan arah tiap faktor mengikuti wilayah dan hasil yang dipilih.*

## 7. Memeriksa kontrak

Buka **Kontrak & Kesepakatan**, lalu pilih pesanan untuk melihat **Ruang Kesepakatan**. Pemeriksaan otomatis pada MVP berfokus pada **harga terhadap acuan**. Untuk rincian lainnya, baca isi pesanan dan riwayatnya sebelum bertindak.

**Pemeriksa kontrak adalah alat bantu. Untuk pertanyaan hukum, mintalah nasihat hukum yang sesuai.**

1. Pastikan Anda membuka pesanan dan mitra yang benar.
2. Cocokkan jenis gabah, volume kesepakatan, harga terbaru per kilogram, serta catatan dan riwayat tawaran harga yang ditampilkan.
3. Hitung ulang nilai pesanan. Contoh hitung: 400 kg × Rp6.700/kg = Rp2.680.000. Pastikan harga yang Anda gunakan adalah harga terakhir pada pesanan.
4. Periksa alasan lampu harga yang tersedia. Lampu hijau menunjukkan posisi harga di dalam rentang acuan. Pemeriksaan mutu gabah dan penelaahan ketentuan kontrak tetap memerlukan perhatian Anda.
5. Baca status, giliran, dan batas waktu. Bila masih ada rincian yang meragukan, tahan persetujuan. Gunakan **Nego Harga** apabila yang perlu diubah adalah harga.
6. Jika sudah **Disetujui Bersama**, gunakan **Surat Kesepakatan** pada ponsel untuk membaca ringkasannya. Layar lebar menampilkan **Surat Kesepakatan Digital**.

[GAMBAR: Ruang Kesepakatan versi MVP yang menampilkan riwayat tawaran harga dan peringatan lampu merah.]

### Selesaikan simulasi bersama

1. Setelah **Disetujui Bersama**, masing-masing pihak membuka pesanan yang sama. Dalam uji coba MVP, ketuk **Konfirmasi Selesai** sesuai skenario simulasi. Pada layar lebar tombolnya bertuliskan **Konfirmasi Gabah Diterima / Transaksi Selesai**.
2. Jika baru satu pihak mengonfirmasi, status tetap **Disetujui Bersama**. Tunggu pihak lain mengonfirmasi dari akunnya.
3. Periksa bahwa status menjadi **Transaksi Selesai** setelah kedua konfirmasi tercatat. Gunakan **Cetak Bukti Kesepakatan** bila perlu menyimpan ringkasan simulasi. Bukti ini mencatat penyelesaian pada SAMBUNG dan tidak membuktikan pembayaran atau penerimaan fisik gabah.

[GAMBAR: Kontrak versi 26 November yang menampilkan Konfirmasi Selesai, lalu Transaksi Selesai setelah dua konfirmasi.]

| Status di layar | Arti |
| --- | --- |
| Menunggu Kesepakatan | Harga belum disepakati. Lihat giliran dan tenggat. |
| Disetujui Bersama | Harga aktif telah diterima. Penyelesaian simulasi masih menunggu konfirmasi. |
| Transaksi Selesai | Kedua pihak sudah mengonfirmasi penyelesaian simulasi. |
| Ditolak | Petani telah menolak pesanan. Baca alasan jika tersedia. |
| Dibatalkan | Pesanan atau kesepakatan telah dibatalkan. |
| Kedaluwarsa | Waktu untuk menyepakati harga telah habis. |

## 8. Pemecahan masalah

### Apa yang harus saya lakukan jika...

**Sinyal lemah atau halaman berhenti memuat?**  
Tunggu sampai koneksi membaik. Jika formulir masih terbuka, periksa apakah isian masih ada. Saat membuat tawaran, ketuk **Simpan Draf** jika tersedia. Jika koneksi terputus sesudah Anda menekan tombol kirim, buka **Tawaran Saya** atau **Kontrak & Kesepakatan** untuk memeriksa hasil sebelum mencoba lagi.

**Saya gagal masuk atau kode tidak diterima?**  
Periksa nomor yang ditampilkan. Ketuk **Ganti Nomor Ponsel** jika salah. Jika nomor sudah benar, gunakan **Kirim Ulang Kode** saat tombolnya aktif dan masukkan kode terbaru. Pada mode demo, periksa petunjuk kode di layar jika tersedia.

**Harga wajar atau prakiraan tidak sesuai harapan?**  
Cocokkan jenis gabah, wilayah, satuan Rp/kg, dan tanggal data. Pertimbangkan mutu gabah serta harga yang Anda ketahui di sekitar Anda. Pada tawaran atau pesanan, masukkan harga yang ingin Anda ajukan dan baca alasan lampunya. Perkiraan dapat berubah mengikuti data dan keadaan pasar.

**Sistem menolak pengajuan atau perubahan kontrak?**  
Baca pesan yang muncul. Jika stok berubah, buka kembali **Katalog Pasokan** dan sesuaikan volume. Jika harga berubah, buka lagi **Ruang Kesepakatan** dan periksa harga terakhir. Jika giliran ada pada mitra, tunggu tanggapannya. Jika tertulis **Kedaluwarsa**, pesanan itu sudah ditutup. Pembeli dapat mengajukan pesanan baru jika tawaran masih tersedia. Jika tertulis **Ditolak**, baca alasan yang dicatat Petani jika tampil.

## 9. Pertanyaan yang sering diajukan

**Saya belum punya alat ukur kadar air. Apakah saya bisa membuat tawaran?**  
Bisa. Biarkan kolom kadar air kosong jika belum diukur. Isikan angka hanya bila ada hasil pengukuran.

**Apakah Pembeli harus memesan seluruh hasil panen?**  
Pembeli boleh memesan sebagian. Periksa **volume tersedia** karena sebagian dari volume awal bisa sedang dicadangkan untuk pesanan lain.

**Apakah prakiraan empat pekan selalu tersedia?**  
Ketersediaannya bergantung pada wilayah dan data. Baca tanggal sasaran dan keterangan metode. Jika layar menampilkan **Acuan Pekan Terakhir**, angka itu berasal dari periode sebelumnya.

**Apakah saya perlu menyetujui lagi harga yang baru saya ajukan?**  
Pengajuan mencatat persetujuan Anda atas harga itu. Jika mitra menerimanya sebelum tenggat, status menjadi **Disetujui Bersama**. Penyelesaian simulasi tetap memerlukan konfirmasi dari kedua pihak.

**Apakah satu kontrak selesai berarti seluruh tawaran habis?**  
Periksa volume tersedia pada tawaran. Satu kontrak hanya mencakup jumlah yang tercantum pada kontrak tersebut.

## 10. Glosarium

| Istilah | Arti |
| --- | --- |
| Petani | Penjual gabah, termasuk akun yang mewakili kelompok tani. |
| Pembeli | Penggilingan atau pengolah yang mencari dan memesan gabah. |
| Tawaran panen | Publikasi Petani berisi jenis gabah, lokasi, volume, dan harga minta. |
| Harga minta | Harga per kilogram yang dicantumkan Petani pada tawaran panen. |
| Pesanan | Permintaan Pembeli atas sebagian atau seluruh volume tawaran pada harga yang diajukan. |
| Tawaran harga aktif | Harga terakhir yang dapat diterima pihak lawan selama waktu kesepakatan masih berlaku. |
| Reservasi volume | Jumlah gabah yang dicadangkan untuk pesanan yang sedang menunggu kesepakatan. |
| Volume tersedia | Jumlah yang masih bisa dipesan setelah memperhitungkan reservasi, kesepakatan aktif, dan volume yang telah selesai. |
| Kontrak simulasi | Catatan bersama tentang pesanan, negosiasi, kesepakatan, dan penyelesaian simulasi. |
| GKP / GKG | Gabah Kering Panen / Gabah Kering Giling. Masing-masing memakai acuan tersendiri. |
| Rendemen | Perbandingan jumlah beras hasil giling dengan jumlah gabah asal. |
| Harga pengamatan | Harga yang tercatat dari sumber pengamatan untuk komoditas, tingkat pasar, wilayah, dan periode tertentu. |
| Harga beras produsen | Harga beras pada tingkat penggilingan dalam data pasar. |
| Rentang harga wajar | Perkiraan batas bawah dan atas harga gabah menurut jenis, wilayah, periode, dan data pembanding. |
| Lampu harga | Petunjuk posisi harga terhadap acuan, disertai warna dan alasan. |
| Prakiraan baseline | Perkiraan dari metode pembanding. Glosarium proyek mensyaratkan identitas metode dan hasil evaluasinya ditunjukkan. |
| Estimasi turunan gabah | Perkiraan harga GKP atau GKG dari prakiraan beras dan perhitungan konversi. |
| Penjelasan SHAP | Uraian arah dan besarnya sumbangan faktor terhadap hasil model tertentu. |
| OTP | Kode sekali pakai untuk verifikasi nomor ponsel. |

## Lampiran

### A. Admin

1. Dari halaman masuk, pilih **Masuk Pengelola (Admin)**. Gunakan email dan sandi akun pengelola, lalu ketuk **Masuk ke Panel Pengawasan**.
2. Buka **Ringkasan Pengawasan** untuk melihat keadaan operasional. Gunakan **Pemantauan Kontrak** untuk membaca status kontrak. Persetujuan harga dan penyelesaian dilakukan oleh Petani dan Pembeli pemilik kontrak.
3. Gunakan **Moderasi Tawaran** untuk meninjau tawaran dan mencatat permintaan perbaikan. Lihat **Log Audit Sistem** untuk menelusuri catatan tindakan yang tersedia.
4. Untuk pekerjaan data, menu yang ditampilkan mencakup **Observasi Data Harga**, **Parameter Sistem & HPP**, dan **Evaluasi Model AI**. Cocokkan wilayah, periode, dan versi data sebelum membaca angka atau mengubah parameter.

[GAMBAR: Ringkasan Pengawasan dan navigasi Admin pada versi MVP.]

### B. Tim pengembang

- Rujukan langkah penggunaan adalah commit `4b4f736` pada 26 November 2026, waktu Indonesia barat. Pemeriksaan dilakukan terhadap kode dan tangkapan layar yang tersedia.
- Untuk uji ulang, jalankan satu skenario dengan dua akun. Petani menerbitkan tawaran. Pembeli memesan sebagian volume. Petani menerima harga atau mengajukan harga balik. Kedua akun mengonfirmasi penyelesaian. Periksa perubahan stok tersedia, status, dan bukti simulasi.
- Untuk menguji informasi harga, simpan wilayah, jenis gabah, tanggal data, serta hasil yang tampil di kalkulator dan pada formulir transaksi. Untuk prakiraan, periksa prakiraan 2/4 pekan, acuan pekan terakhir, dan tampilan saat faktor belum tersedia.
- Sebelum mengonversi ke DOCX atau PDF, letakkan Markdown ini di akar repositori agar gambar pada `SAMBUNG-panel-capture/mobile/` dapat dimuat. Ganti penanda gambar dengan tangkapan layar yang sesuai versi. Untuk keluaran visual yang mengikuti arahan buku ini, gunakan Plus Jakarta Sans untuk judul dan Inter untuk isi. Lihat catatan keputusan tipografi pada Lampiran C.

### C. Perbedaan sumber dan hal yang perlu diverifikasi

| Topik | Perbedaan atau batas bukti |
| --- | --- |
| Identitas tim, tanggal, dan versi SRS | SRS v0.2 serta draf ISO D1 merujuk target lomba 26–28 November. PDF lokal lain berlabel v0.1 dan menulis 23.59 pada sampul. Buku memakai identitas Tim 23.58 dan batas 16–26 November sesuai penugasan. |
| Peran pembeli dan nama menu | SRS v0.2, IA v0.2, dan glosarium menggunakan Pembeli. IA prototipe menggunakan Produsen dan mencantumkan ruang kerja Pendamping serta Dinas. Kode 26 November memakai **Dasbor Pembeli**. Salinan kerja sesudah batas MVP memakai **Dasbor Produsen**. IA v0.2 merujuk **Pesanan/Kontrak**, sedangkan menu 26 November menampilkan **Kontrak & Kesepakatan**. |
| Masuk dan daftar | IA prototipe mencantumkan masuk Produsen dengan kata sandi dan verifikasi terpisah. SRS v0.2, DEC-010a, dan kode MVP memakai nomor ponsel dan OTP untuk Petani dan Pembeli. Kanal OTP di luar demo **[PERLU DIVERIFIKASI]** untuk versi tanggal batas. |
| Harga dan prakiraan tanpa akun | IA v0.2 mencantumkan PT-07 dan PB-04 sebagai informasi publik. Kode tanggal batas menempatkan keduanya di ruang kerja berakun. Akses publik langsung **[PERLU DIVERIFIKASI]**. |
| Penerbitan ketika acuan kosong | DEC-007e dan SRS mengizinkan terbit tanpa acuan. Pada versi tanggal batas, kegagalan layanan pemeriksaan dapat menghentikan tahap tinjau. Perilaku untuk wilayah tanpa acuan yang valid **[PERLU DIVERIFIKASI]**. |
| Penyelesaian dan pembukaan kontak | DEC-005h dan kontrak versi 26 November memakai dua konfirmasi selesai. SRS dan kode tanggal batas membuka kontak selama status Disetujui. Dokumen `contract-flow.md` dan sebagian tangkapan layar memuat tanda tangan dan menunjukkan waktu pembukaan kontak yang berbeda. Riwayat kode mencatat perubahan tersebut pada 27 November. |
| Makna status kontrak | SRS dan DEC-004 menetapkan transaksi simulasi. Teks antarmuka pada versi tanggal batas juga menyebut serah terima fisik dan pembayaran mandiri di lapangan. Bab 7 menyatakan cakupan simulasi sesuai batas MVP. |
| Isi pemeriksaan kontrak | DEC-002 dan FR-008 mendokumentasikan pemeriksaan harga dan riwayatnya. Permintaan panduan menyebut pemeriksaan isi kontrak. Pada kode tanggal batas, pemeriksaan menyeluruh atas klausul **[PERLU DIVERIFIKASI]**. Bab 7 memandu pemeriksaan harga dan pembacaan rincian oleh pengguna. |
| Acuan pengganti dan tampilan prakiraan | DEC-008d memakai label **Prakiraan baseline** dan mensyaratkan metode pembanding yang telah dievaluasi. UI menampilkan **Acuan Pekan Terakhir**. Kesesuaian bukti evaluasi per wilayah dan horizon **[PERLU DIVERIFIKASI]**. Tangkapan layar juga dapat mengutamakan gabah, sedangkan halaman versi batas menampilkan taksiran beras produsen dan turunan gabah. |
| Tipografi | Arahan untuk keluaran visual buku meminta Inter sebagai font isi. DEC-011d menetapkan Atkinson Hyperlegible Next untuk isi antarmuka. Keduanya menetapkan Plus Jakarta Sans untuk judul. |

**Usulan** — Cocokkan perbedaan di atas pada satu versi demo yang disepakati tim. Ambil tangkapan layar dari versi itu dan catat hasil uji untuk akses publik, acuan kosong, pemeriksaan kontrak, dan penyelesaian oleh dua akun sebelum menerbitkan panduan final.

### D. Rencana pengembangan

SRS mencatat ruang kerja Pendamping dan Dinas, transaksi nyata terverifikasi, pembayaran, logistik, verifikasi mutu fisik, pelatihan ulang otomatis, peringatan dini otomatis, multibahasa, dan langganan berbayar sebagai lingkup lanjutan. Riwayat repositori juga mencatat tanda tangan digital, pengiriman dan penerimaan berstatus terpisah, pembayaran sandbox, dan langganan sesudah 26 November. Bagian ini mencatat cakupan dan jejak perubahan tanpa menetapkan jadwal rilis.

### E. Sumber panduan

- `../sambung_ideate/docs/source_of_truth/SRS_SAMBUNG.md` v0.2, terutama FR-001, FR-004 sampai FR-010, FR-015, FR-016, dan FR-023 sampai FR-028.
- `../SRS_SAMBUNG_ISO-IEC-IEEE-29148.docx`, draf D1 berbasis v0.2, serta `docs/SRS_SAMBUNG.pdf` v0.1 untuk pencatatan perbedaan.
- `../sambung_ideate/docs/source_of_truth/IA_SAMBUNG.md`, `GLOSSARY.md`, dan `decision-log.md`. IA prototipe pembanding ada di `../information-architecture.md`.
- `SAMBUNG-panel-capture/mobile/`, khususnya rangkaian F03, F04, F07, F10, dan F12.
- Repositori SAMBUNG pada commit `4b4f736`. Rujukan utama mencakup `sambung-fe/constant/navigation.ts`, halaman masuk/daftar/prakiraan/harga wajar, komponen tawaran/pesanan/kontrak, dan modul backend `pricing`, `forecast`, serta `contracts`. Riwayat perubahan kontrak dibandingkan dengan `docs/flow-recog/contract-flow.md` dan commit `23099c6` serta `8111917`.
