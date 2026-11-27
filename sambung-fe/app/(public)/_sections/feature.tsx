import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { AuthAwareLinkButton } from "@/features/auth/components/auth-aware-link-button";
import { Calculator, TrendingUp, Sprout, ArrowRight, type LucideIcon } from "lucide-react";

type FeatureCardItem = {
  title: string;
  description: string;
  icon: LucideIcon;
  badgeClassName?: string;
  action: ReactNode;
};

const FEATURE_CARDS: FeatureCardItem[] = [
  {
    title: "Cek Harga Wajar",
    description:
      "Lihat batas bawah dan atas harga wajar GKP dan GKG di wilayah Anda, lengkap dengan penjelasan sederhana tentang cara menghitungnya.",
    icon: Calculator,
    action: (
      <ButtonLink
        variant="outline"
        size="sm"
        className="gap-2 font-semibold text-xs cursor-pointer hover:bg-primary/10 hover:text-primary hover:border-primary/40 w-fit"
        href="/peta-harga"
      >
        Cek Harga Wilayah
        <ArrowRight className="w-3.5 h-3.5" />
      </ButtonLink>
    ),
  },
  {
    title: "Pantau Harga, Lihat Arah Pasar",
    description:
      "Pantau selisih harga antarprovinsi, rantai harga dari petani ke eceran, dan prakiraan 2 sampai 4 pekan ke depan.",
    icon: TrendingUp,
    action: (
      <ButtonLink
        variant="outline"
        size="sm"
        className="gap-2 font-semibold text-xs cursor-pointer hover:bg-blue-500/10 hover:text-blue-700 dark:hover:text-blue-400 hover:border-blue-500/40 w-fit"
        href="/peta-harga"
      >
        Jelajahi Peta & Prakiraan
        <ArrowRight className="w-3.5 h-3.5" />
      </ButtonLink>
    ),
  },
  {
    title: "Tawarkan Panen, Sepakati Harga",
    description:
      "Pasang tawaran panen, terima pesanan dari produsen, dan sepakati harga langsung. Semua tercatat jelas dan petani menerima 100% tanpa potongan.",
    icon: Sprout,
    action: (
      <AuthAwareLinkButton
        variant="outline"
        size="sm"
        className="gap-2 font-semibold text-xs cursor-pointer hover:bg-primary/10 hover:text-primary w-fit"
        guestHref="/masuk"
        guestLabel="Masuk dan Mulai Menawarkan"
        authenticatedLabel="Buka Ruang Kerja"
        trailingIcon={<ArrowRight className="w-3.5 h-3.5" />}
      />
    ),
  },
];

function FeatureCard({
  title,
  description,
  icon: Icon,
  badgeClassName = "bg-primary text-primary-foreground",
  action,
}: FeatureCardItem) {
  return (
    <Card className="relative overflow-visible rounded-3xl border border-border/80 ring-0 bg-card px-6 pb-6 pt-20 sm:px-7 sm:pb-7 sm:pt-20 flex flex-col justify-between items-center text-center gap-6 shadow-xs hover:border-primary/40 transition-colors">
      {/* Lencana ikon bulat menggantung di tengah atas batas kartu */}
      <div
        className={`absolute -top-12 left-1/2 -translate-x-1/2 h-24 w-24 rounded-full ring-[6px] ring-background shadow-sm flex items-center justify-center transition-transform duration-200 group-hover/card:-translate-y-0.5 ${badgeClassName}`}
      >
        <Icon className="w-10 h-10" strokeWidth={1.75} />
      </div>

      <div className="space-y-2">
        <h3 className="font-display font-extrabold text-xl text-foreground">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>

      <div className="pt-2">{action}</div>
    </Card>
  );
}

export default function FeatureSection() {
  return (
    <section
      id="fitur"
      className="min-h-[calc(100vh-4rem)] min-h-[620px] flex flex-col justify-center max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10 sm:space-y-12 scroll-mt-20"
    >
      {/* Header Centered Top-to-Bottom */}
      <div className="text-center max-w-3xl mx-auto space-y-4 sm:space-y-6">
        <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
          Instrumen Digital untuk Perdagangan Gabah Modern
        </h2>
        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
          Dari kalkulasi harga wajar sebelum panen hingga peta sebaran spasial nasional dan komitmen transaksi digital, semua dirancang untuk efisiensi dan transparansi perdagangan gabah.
        </p>
      </div>

      {/* Cards berjejer dari Left to Right (pt-12 memberi ruang tonjolan lencana atas) */}
      <div className="grid grid-cols-1 md:grid-cols-3 pt-12 gap-y-20 md:gap-8">
        {FEATURE_CARDS.map((card) => (
          <FeatureCard key={card.title} {...card} />
        ))}
      </div>
    </section>
  );
}
