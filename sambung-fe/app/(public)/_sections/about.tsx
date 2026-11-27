import { Database, BadgePercent, TrendingUp, Info, type LucideIcon } from "lucide-react";

type AboutCardItem = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const ABOUT_CARDS: AboutCardItem[] = [
  {
    title: "Harga dengan sumber jelas",
    description:
      "Acuan harga wajar dari PIHPS dan BPS, lengkap dengan tanggal pembaruan.",
    icon: Database,
  },
  {
    title: "Gratis, tanpa komisi",
    description:
      "Cek harga dan nego langsung tanpa biaya langganan atau potongan.",
    icon: BadgePercent,
  },
  {
    title: "Prakiraan harga gabah",
    description:
      "Proyeksi harga 2 dan 4 pekan ke depan untuk menentukan waktu jual.",
    icon: TrendingUp,
  },
];

function FolderCard({ title, description, icon: Icon }: AboutCardItem) {
  return (
    <div className="group relative flex h-full flex-col [--folder-stroke:color-mix(in_srgb,var(--foreground)_11%,var(--card))] hover:[--folder-stroke:color-mix(in_srgb,var(--primary)_40%,var(--card))]">
      {/* Folder-tab silhouette preserving bg-card surface, perimeter stroke, and outer shadow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex flex-col drop-shadow-[0_2px_10px_rgba(15,23,42,0.05)] transition-[filter] duration-200 group-hover:drop-shadow-[0_6px_18px_rgba(15,23,42,0.08)] dark:drop-shadow-[0_4px_16px_rgba(0,0,0,0.35)]"
      >
        <div className="flex h-10 w-full shrink-0 items-stretch">
          <div className="mt-4 w-[38%] rounded-tl-[20px] border-t border-l border-[color:var(--folder-stroke)] bg-card transition-colors duration-200" />
          <svg
            viewBox="0 0 42 40"
            fill="none"
            className="-mx-px h-10 w-[42px] shrink-0"
          >
            <path
              d="M 0 16.5 L 1 16.5 Q 6 16.5 10.41 14.15 L 31.59 2.85 Q 36 0.5 41 0.5 L 42 0.5 L 42 40 L 0 40 Z"
              className="fill-card"
            />
            <path
              d="M 0 16.5 L 1 16.5 Q 6 16.5 10.41 14.15 L 31.59 2.85 Q 36 0.5 41 0.5 L 42 0.5"
              stroke="var(--folder-stroke)"
              strokeWidth="1"
              className="transition-colors duration-200"
            />
          </svg>
          <div className="flex-1 rounded-tr-[20px] border-t border-r border-[color:var(--folder-stroke)] bg-card transition-colors duration-200" />
        </div>

        <div className="relative flex-1 rounded-b-[20px] border-x border-b border-[color:var(--folder-stroke)] bg-card transition-colors duration-200">
          <div className="absolute -top-px inset-x-[1px] h-[2px] bg-card" />
        </div>
      </div>

      {/* Card content */}
      <div className="relative z-10 flex h-full flex-col px-5 pt-4 pb-5 sm:px-6 sm:pt-4.5 sm:pb-6">
        <div className="mt-5 space-y-1.5 sm:mt-6">
          <h3 className="font-display text-sm font-bold leading-snug text-foreground sm:text-base">
            {title}
          </h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AboutSection() {
  return (
    <section id="tentang" className="min-h-[calc(100vh-4rem)] flex flex-col justify-center max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10 sm:space-y-12 scroll-mt-20">
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

        <div className="grid w-full max-w-4xl grid-cols-1 gap-3.5 sm:grid-cols-3 sm:gap-4">
          {ABOUT_CARDS.map((card) => (
            <FolderCard key={card.title} {...card} />
          ))}
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

