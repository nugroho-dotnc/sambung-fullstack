import { Card } from "@/components/ui/card";
import { Database, BadgePercent, ShieldCheck, Info } from "lucide-react";

export default function AboutSection() {
  return (
    <section id="tentang" className="min-h-[calc(100vh-4rem)] min-h-[600px] flex flex-col justify-center max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10 sm:space-y-12 scroll-mt-20">
      {/* 5.5 : 4.5 Ratio Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[11fr_9fr] gap-8 lg:gap-12 xl:gap-16 items-center">
        {/* Left: Title & Description (55% ratio) */}
        <div className="space-y-6 sm:space-y-8 text-left">
          <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
            Tahu Harga Sebelum Menjual, Itu Hak Petani
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl">
            Panen yang bagus layak dijual dengan harga yang pantas. SAMBUNG membuka informasi harga gabah (GKP dan GKG) agar Anda punya pegangan, lalu menghubungkan Anda langsung dengan penggilingan untuk bernegosiasi secara setara.
          </p>
        </div>

        {/* Right: Three Cards in 2 Rows (45% ratio) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          {/* Row 1 - Card 1 */}
          <Card className="rounded-2xl border-border/80 bg-card p-4 sm:p-5 shadow-xs hover:border-primary/40 transition-colors flex flex-col justify-between">
            <div className="flex flex-col items-start space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display font-bold text-sm sm:text-base text-foreground leading-snug">
                  Harga dengan sumber jelas
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Rentang harga wajar dan proyeksi bersumber dari PIHPS dan BPS, lengkap dengan tanggal pembaruan datanya.
                </p>
              </div>
            </div>
          </Card>

          {/* Row 1 - Card 2 */}
          <Card className="rounded-2xl border-border/80 bg-card p-4 sm:p-5 shadow-xs hover:border-primary/40 transition-colors flex flex-col justify-between">
            <div className="flex flex-col items-start space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <BadgePercent className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display font-bold text-sm sm:text-base text-foreground leading-snug">
                  Gratis, tanpa komisi
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Cek harga, ajukan penawaran, dan nego langsung tanpa langganan maupun potongan.
                </p>
              </div>
            </div>
          </Card>

          {/* Row 2 - Card 3 (Spanning 2 columns, column-directed) */}
          <Card className="rounded-2xl border-border/80 bg-card p-4 sm:p-5 shadow-xs hover:border-primary/40 transition-colors sm:col-span-2 flex flex-col justify-between">
            <div className="flex flex-col items-start space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display font-bold text-sm sm:text-base text-foreground leading-snug">
                  Nomor Anda aman
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Nomor ponsel tidak dipajang di katalog umum. Baru terbuka setelah kedua pihak sepakat harga.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Disclaimer di bawah dengan text kecil */}
      <div className="flex items-start gap-2 pt-4 text-xs text-muted-foreground/75 leading-relaxed border-t border-border/40">
        <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
        <p>
          SAMBUNG mencatat kesepakatan harga dan volume antara petani dan penggilingan. Pembayaran dan pengiriman diatur langsung oleh kedua pihak. Harga wajar dan proyeksi menjadi acuan, bukan harga yang pasti.
        </p>
      </div>
    </section>
  );
}
