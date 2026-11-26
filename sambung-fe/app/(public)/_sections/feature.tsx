import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AuthAwareLinkButton } from "@/features/auth/components/auth-aware-link-button";
import { Calculator, TrendingUp, Sprout, ArrowRight } from "lucide-react";

export default function FeatureSection() {
  return (
    <section id="fitur" className="min-h-[calc(100vh-4rem)] min-h-[620px] flex flex-col justify-center max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10 sm:space-y-12 scroll-mt-20">
      {/* Header Centered Top-to-Bottom */}
      <div className="text-center max-w-3xl mx-auto space-y-4 sm:space-y-6">
        <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
          Instrumen Digital untuk Perdagangan Gabah Modern
        </h2>
        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
          Dari kalkulasi harga wajar sebelum panen hingga peta sebaran spasial nasional dan komitmen transaksi digital, semua dirancang untuk efisiensi dan transparansi perdagangan gabah.
        </p>
      </div>

      {/* Cards berjejer dari Left to Right */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        {/* Card 1: Cek Harga Wajar */}
        <Card className="rounded-3xl border-border/80 bg-card p-6 sm:p-7 flex flex-col justify-between space-y-6 shadow-xs hover:border-primary/40 transition-colors">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <Calculator className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="font-display font-extrabold text-xl text-foreground">
                Cek Harga Wajar
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Lihat batas bawah dan atas harga wajar GKP dan GKG di wilayah Anda, lengkap dengan penjelasan sederhana tentang cara menghitungnya.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 font-semibold text-xs cursor-pointer hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-400 hover:border-emerald-500/40 w-fit"
              render={<Link href="/peta-harga" />}
            >
              Cek Harga Wilayah
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </Card>

        {/* Card 2: Pantau Harga, Lihat Arah Pasar */}
        <Card className="rounded-3xl border-border/80 bg-card p-6 sm:p-7 flex flex-col justify-between space-y-6 shadow-xs hover:border-primary/40 transition-colors">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-700 dark:text-blue-400 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="font-display font-extrabold text-xl text-foreground">
                Pantau Harga, Lihat Arah Pasar
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Pantau selisih harga antarprovinsi, rantai harga dari petani ke eceran, dan prakiraan 2 sampai 4 pekan ke depan.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 font-semibold text-xs cursor-pointer hover:bg-blue-500/10 hover:text-blue-700 dark:hover:text-blue-400 hover:border-blue-500/40 w-fit"
              render={<Link href="/peta-harga" />}
            >
              Jelajahi Peta & Prakiraan
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </Card>

        {/* Card 3: Tawarkan Panen, Sepakati Harga */}
        <Card className="rounded-3xl border-border/80 bg-card p-6 sm:p-7 flex flex-col justify-between space-y-6 shadow-xs hover:border-primary/40 transition-colors">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Sprout className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="font-display font-extrabold text-xl text-foreground">
                Tawarkan Panen, Sepakati Harga
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Pasang tawaran panen, terima pesanan dari pembeli, dan sepakati harga langsung. Semua tercatat dan bebas komisi.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <AuthAwareLinkButton
              variant="outline"
              size="sm"
              className="gap-2 font-semibold text-xs cursor-pointer hover:bg-primary/10 hover:text-primary w-fit"
              guestHref="/masuk"
              guestLabel="Masuk dan Mulai Menawarkan"
              authenticatedLabel="Buka Ruang Kerja"
              trailingIcon={<ArrowRight className="w-3.5 h-3.5" />}
            />
          </div>
        </Card>
      </div>
    </section>
  );
}
