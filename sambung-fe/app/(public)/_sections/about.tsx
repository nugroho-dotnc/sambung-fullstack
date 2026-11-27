import { Card } from "@/components/ui/card";
import { Database, BadgePercent, ShieldCheck, Info } from "lucide-react";

export default function AboutSection() {
  return (
    <section id="tentang" className="min-h-[calc(100vh-4rem)] min-h-[600px] flex flex-col justify-center max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10 sm:space-y-12 scroll-mt-20">
      {/* 5.5 : 4.5 Ratio Grid Layout */}
      <div className="flex flex-col gap-8 lg:gap-12 xl:gap-16 items-start justify-center">
        {/* Left: Title & Description (55% ratio) */}
        <div className="space-y-6 sm:space-y-8 text-left">
          <div className="space-y-4">
            <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
              Tahu Harga Sebelum Menjual, 
            </h2>
            <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
              Itu Hak Petani
            </h2>
          </div>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-3xl">
           SAMBUNG membuka informasi harga gabah (GKP dan GKG) agar petani punya pegangan, lalu menghubungkan Anda langsung dengan penggilingan untuk bernegosiasi secara setara.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 max-w-4xl">
          {/* Row 1 - Card 1 */}
          <Card className="rounded-xl border-border/80 bg-card p-4 sm:p-5 shadow-xs hover:border-primary/40 transition-colors flex flex-col justify-between">
            <div className="flex flex-col items-start space-y-2.5">
              
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
          <Card className="rounded-xl border-border/80 bg-card p-4 sm:p-5 shadow-xs hover:border-primary/40 transition-colors flex flex-col justify-between">
            <div className="flex flex-col items-start space-y-2.5">
              
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

          <Card className="rounded-xl border-border/80 bg-card p-4 sm:p-5 shadow-xs hover:border-primary/40 transition-colors flex flex-col justify-between">
            <div className="flex flex-col items-start space-y-2.5">
              
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

