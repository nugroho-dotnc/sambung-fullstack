import { Scale, ShieldCheck, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function PillarsSection() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-2xl border-border/80 bg-card p-6 space-y-3 shadow-xs hover:border-primary/50 transition-colors">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
            <Scale className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-foreground font-display">Acuan Rentang Harga Wajar</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Kalkulasi batas bawah dan atas operasional gabah (GKP/GKG) secara transparan berdasarkan rendemen giling dan harga beras produsen.
          </p>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card p-6 space-y-3 shadow-xs hover:border-primary/50 transition-colors">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-foreground font-display">Kesepakatan Digital Terikat</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Petani dan pembeli menyepakati tonase dan harga secara langsung dalam komitmen digital terikat, dilengkapi bukti cetak resmi dan bebas komisi.
          </p>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card p-6 space-y-3 shadow-xs hover:border-primary/50 transition-colors">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-400 flex items-center justify-center">
            <MapPin className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-foreground font-display">Disparitas Spasial 34 Provinsi</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Pemetaan selisih harga gabah antarpulau dan antarwilayah sentra surplus versus wilayah konsumen secara geospasial real-time.
          </p>
        </Card>
      </div>
    </section>
  );
}
