"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import {
  BookOpen,
  ShieldCheck,
  Lock,
  EyeOff,
  MapPin,
  CircleDollarSign,
  FileCheck2,
  HelpCircle,
  Search,
  ExternalLink,
} from "lucide-react";

interface GlossaryItem {
  term: string;
  definition: string;
  category: "komoditas" | "transaksi" | "intelijen";
}

const GLOSSARY_ITEMS: GlossaryItem[] = [
  {
    term: "GKP (Gabah Kering Panen)",
    category: "komoditas",
    definition:
      "Gabah hasil panen langsung dari persawahan dengan kadar air berkisar 20% - 25%. Gabah tipe ini memiliki acuan rendemen konversi standar 53,38% menjadi beras medium.",
  },
  {
    term: "GKG (Gabah Kering Giling)",
    category: "komoditas",
    definition:
      "Gabah yang telah melalui proses pengeringan sehingga kadar air berada pada kisaran 14%. Memiliki acuan rendemen konversi standar 63% menjadi beras siap konsumsi.",
  },
  {
    term: "Tawaran Panen (Offer)",
    category: "transaksi",
    definition:
      "Deklarasi kuota tonase panen dan batas harga minimum oleh petani atau kelompok tani. Satu tawaran dapat dipenuhi oleh beberapa pesanan pembelian parsial dari berbagai mitra penggilingan.",
  },
  {
    term: "Kesepakatan Digital Terikat",
    category: "transaksi",
    definition:
      "Catatan komitmen resmi antara petani dan produsen untuk mengikat harga gabah, kuota volume, dan jadwal serah terima fisik secara transparan dan bebas komisi perantara.",
  },
  {
    term: "Bilah Spektrum Lampu Harga",
    category: "intelijen",
    definition:
      "Indikator 4 zona kewajaran harga penawaran: Zona Hijau (Wajar, sesuai acuan pasar), Zona Kuning (Toleransi batas atas 3%), Zona Oranye (Batas bawah kritis), dan Zona Merah (Di bawah acuan wajar, memerlukan konfirmasi sadar petani).",
  },
  {
    term: "Pencadangan Volume Atomik",
    category: "transaksi",
    definition:
      "Mekanisme penguncian kuota tonase secara otomatis dan instan saat produsen mengajukan pesanan parsial, menjamin tidak terjadi penjualan ganda (overbooking) pada tawaran yang sama.",
  },
  {
    term: "Farmer's Share (Porsi Petani)",
    category: "intelijen",
    definition:
      "Persentase rasio harga yang diterima petani di tingkat sawah dibanding harga eceran beras di tingkat konsumen akhir. Menjadi tolok ukur keadilan distribusi rantai pasok beras nasional.",
  },
  {
    term: "HPP (Harga Pembelian Pemerintah)",
    category: "intelijen",
    definition:
      "Batas harga pembelian dasar yang ditetapkan oleh regulator pemerintah (Badan Pangan Nasional) untuk mencegah kejatuhan harga gabah petani di bawah biaya operasional produksi sawah.",
  },
  {
    term: "Rekening Bersama (Escrow) & Biaya Layanan",
    category: "transaksi",
    definition:
      "Dana pembayaran dari produsen ditahan sementara dengan aman oleh sistem selama gabah dikirim hingga diterima. Petani menerima 100% nilai gabah bersih tanpa potongan, sedangkan produsen menanggung biaya layanan transaksi ringan 0,5% (atau 0,25% bagi anggota Produsen Pro).",
  },
  {
    term: "Produsen Pro",
    category: "transaksi",
    definition:
      "Paket langganan opsional khusus akun Produsen atau Penggilingan (Rp99.000 per 30 hari) untuk membuka riwayat harga sejak 2019, unduh data tabel (CSV), peta serta perkiraan harga semua provinsi beserta faktor penyebabnya, dan potongan 50% biaya layanan transaksi menjadi 0,25%.",
  },
];

export default function BantuanPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("semua");

  const filteredGlossary = GLOSSARY_ITEMS.filter((item) => {
    const matchesSearch =
      item.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.definition.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      activeCategory === "semua" || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-16">
      {/* Header & Breadcrumb */}
      <div>
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs text-muted-foreground mb-2"
        >
          <Link href="/" className="hover:text-foreground font-semibold">
            SAMBUNG
          </Link>
          <span className="text-muted-foreground/50">/</span>
          <span className="font-medium text-foreground">
            Bantuan & Kebijakan Data
          </span>
        </nav>

        <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Pusat Bantuan, Glosarium & Kebijakan
        </h1>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed max-w-3xl">
          Panduan istilah domain komoditas gabah, tata kelola kesepakatan digital terikat,
          serta komitmen perlindungan kerahasiaan data privasi petani dan produsen.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Glossary Column (Left, 7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="flex items-center justify-between gap-3 pb-2 border-b border-border/80">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="font-display font-bold text-lg text-foreground">
                Glosarium Istilah Gabah & Pasar
              </h2>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              {filteredGlossary.length} istilah
            </span>
          </div>

          {/* Search & Category Filter */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari istilah, misalnya 'GKP', 'Rendemen', atau 'Farmer's Share'..."
                className="w-full h-10 pl-9 pr-3 rounded-xl border border-border/80 bg-background text-xs text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              <button
                type="button"
                onClick={() => setActiveCategory("semua")}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                  activeCategory === "semua"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory("komoditas")}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                  activeCategory === "komoditas"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                Komoditas Gabah
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory("transaksi")}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                  activeCategory === "transaksi"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                Kesepakatan & Pasokan
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory("intelijen")}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                  activeCategory === "intelijen"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                Intelijen & Harga
              </button>
            </div>
          </div>

          {/* Cards List */}
          <div className="space-y-3 pt-1">
            {filteredGlossary.length === 0 ? (
              <Card className="p-6 text-center text-xs text-muted-foreground bg-card border-border/80 rounded-2xl shadow-xs">
                Tidak ada istilah glosarium yang cocok dengan kata pencarian Anda.
              </Card>
            ) : (
              filteredGlossary.map((g) => (
                <Card
                  key={g.term}
                  className="p-4 sm:p-5 bg-card border border-border/80 rounded-2xl shadow-xs hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display font-bold text-sm text-foreground">
                      {g.term}
                    </h3>
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                      {g.category}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    {g.definition}
                  </p>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Privacy & Safeguard Column (Right, 5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-border/80">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h2 className="font-display font-bold text-lg text-foreground">
              Kebijakan Privasi & Batasan Layanan
            </h2>
          </div>

          <Card className="p-6 bg-card border border-border/80 rounded-2xl shadow-xs space-y-6">
            {/* Contact Masking */}
            <div className="flex items-start gap-3.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
                <Lock className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h4 className="font-display font-bold text-sm text-foreground">
                  Perlindungan Kontak (Contact Masking)
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Nomor telepon petani dan produsen <strong>hanya saling terbuka</strong> saat
                  kesepakatan pasokan telah berstatus <strong>Disetujui</strong> kedua belah pihak.
                  Sebelum negosiasi disepakati dan setelah transaksi selesai atau dibatalkan,
                  kontak ditutup kembali untuk mencegah spam atau tekanan pihak luar.
                </p>
              </div>
            </div>

            {/* Admin Anonymity */}
            <div className="flex items-start gap-3.5 pt-5 border-t border-border/70">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5">
                <EyeOff className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h4 className="font-display font-bold text-sm text-foreground">
                  Anonimitas pada Panel Pengawas
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Petugas operasional dan pengawas platform hanya dapat melihat kontak dalam
                  format tersamar (contoh: <code className="tabular-nums text-xs bg-muted px-1.5 py-0.5 rounded">0812-****-7890</code>).
                  Pengawas tidak memiliki akses membuka data nomor telepon pribadi pengguna.
                </p>
              </div>
            </div>

            {/* District-level Precision */}
            <div className="flex items-start gap-3.5 pt-5 border-t border-border/70">
              <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h4 className="font-display font-bold text-sm text-foreground">
                  Presisi Lokasi Maksimal Tingkat Kecamatan
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Data hasil panen yang dipublikasikan pada katalog terbuka hanya dibatasi
                  hingga tingkat kecamatan dan kabupaten/kota. Alamat rumah atau titik koordinat
                  GPS presisi tidak pernah dipublikasikan secara terbuka.
                </p>
              </div>
            </div>

            {/* Zero Commission for Farmers */}
            <div className="flex items-start gap-3.5 pt-5 border-t border-border/70">
              <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
                <CircleDollarSign className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h4 className="font-display font-bold text-sm text-foreground">
                  100% Tanpa Potongan Hasil Panen Petani
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Petani menerima 100% nilai gabah yang disepakati tanpa potongan apa pun maupun
                  biaya langganan. Untuk menjaga keamanan transaksi melalui rekening bersama (escrow),
                  produsen menanggung biaya layanan transaksi ringan sebesar 0,5% (atau 0,25% bagi
                  anggota Produsen Pro).
                </p>
              </div>
            </div>

            {/* Service Protection Policy */}
            <div className="flex items-start gap-3.5 pt-5 border-t border-border/70">
              <div className="p-2 rounded-xl bg-muted text-muted-foreground shrink-0 mt-0.5">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h4 className="font-display font-bold text-sm text-foreground">
                  Batasan Tanggung Jawab Layanan
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  SAMBUNG bertindak sebagai penyedia teknologi intelijen harga dan sistem
                  pencatatan kesepakatan pasokan digital. Penyerahan fisik gabah dan pelunasan
                  pembayaran dijalankan langsung antar kedua pihak yang didukung oleh verifikasi
                  ganda serah terima fisik (0/2 hingga 2/2).
                </p>
              </div>
            </div>
          </Card>

          {/* Quick Help Link Card */}
          <Card className="p-5 bg-card border border-border/80 rounded-2xl shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-foreground font-display font-bold text-sm">
              <HelpCircle className="w-4 h-4 text-primary" />
              <span>Butuh Bantuan Navigasi Pasar?</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Jika Anda memerlukan konsultasi terkait penentuan harga gabah wajar daerah atau
              penggunaan bilah kalkulator spektrum panen, buka kalkulator acuan harga wajar.
            </p>
            <ButtonLink
              size="sm"
              variant="outline"
              className="w-full text-xs font-semibold justify-between cursor-pointer"
              href="/harga-wajar"
            >
              <span>Kalkulator Acuan Harga Wajar</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </ButtonLink>
          </Card>
        </div>
      </div>
    </div>
  );
}
