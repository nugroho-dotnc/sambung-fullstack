import { ArrowRight, Sprout, Building2 } from "lucide-react";
import { AuthAwareLinkButton } from "@/features/auth/components/auth-aware-link-button";

export default function WorkspaceCtaSection() {
  return (
    <section className="min-h-[calc(100vh-4rem)] min-h-[500px] flex flex-col justify-center max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 sm:space-y-10">
      <div className="space-y-3 sm:space-y-4 max-w-3xl text-left">
        <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
          Panen Sudah Siap, Harga Sudah Jelas
        </h2>
        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
          Tinggal pilih dari sisi mana Anda ingin memulai.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Kartu Petani */}
        <div className="rounded-3xl border border-primary/20 bg-card p-6 sm:p-8 space-y-6 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-colors">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Sprout className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-bold font-display text-foreground">
                Saya Petani atau Kelompok Tani
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Ketahui harga wajar sebelum menjual dan pastikan gabah Anda dihargai pantas.
              </p>
            </div>
          </div>
          <div className="pt-2">
            <AuthAwareLinkButton
              variant="outline"
              size="lg"
              className="min-h-11 border-primary/40 text-primary hover:bg-primary/10 cursor-pointer font-semibold"
              guestHref="/masuk"
              guestLabel="Mulai Menjual"
              authenticatedLabel="Buka Ruang Kerja"
              authenticatedLabelByRole={{ petani: "Buka Ruang Petani" }}
              trailingIcon={<ArrowRight className="w-4 h-4 ml-2" />}
            />
          </div>
        </div>

        {/* Kartu Produsen */}
        <div className="rounded-3xl border border-amber-500/20 bg-card p-6 sm:p-8 space-y-6 shadow-xs flex flex-col justify-between hover:border-amber-500/40 transition-colors">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-bold font-display text-foreground">
                Saya Produsen / Penggilingan
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Temukan pasokan gabah dari kelompok tani dan sepakati jumlahnya langsung.
              </p>
            </div>
          </div>
          <div className="pt-2">
            <AuthAwareLinkButton
              variant="outline"
              size="lg"
              className="min-h-11 border-amber-600/40 text-amber-800 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer font-semibold"
              guestHref="/masuk"
              guestLabel="Mulai Mencari Gabah"
              authenticatedLabel="Buka Ruang Kerja"
              authenticatedLabelByRole={{ pembeli: "Buka Ruang Produsen" }}
              trailingIcon={<ArrowRight className="w-4 h-4 ml-2" />}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
