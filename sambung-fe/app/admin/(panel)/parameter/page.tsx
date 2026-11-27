"use client";

import { useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/shared/page-container";
import { SettingsFormSkeleton } from "@/components/shared/page-skeletons";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useAdminParameters,
  useUpdateParameters,
} from "@/features/admin/hooks/use-admin";
import type { SystemParameters } from "@/features/admin/domain/admin-types";
import {
  Settings2,
  Sliders,
  Check,
  Percent,
  Clock,
  Scale,
  Info,
  AlertCircle,
} from "lucide-react";

function ParameterFieldHelp({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label="Penjelasan parameter"
            className="inline-flex items-center text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        }
      />
      <TooltipContent className="max-w-xs text-xs leading-relaxed">
        <p>{text}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function ParametersForm({
  initialParameters,
}: {
  initialParameters?: SystemParameters;
}) {
  const updateMutation = useUpdateParameters();

  const [defaultDurationHours, setDefaultDurationHours] = useState(
    initialParameters?.orderExpiryHours ?? 24
  );
  const [tolerancePercent, setTolerancePercent] = useState(
    Number(((initialParameters?.fairPriceToleranceDelta ?? 0.03) * 100).toFixed(2))
  );
  const [rendemenGKP, setRendemenGKP] = useState(
    Number(((initialParameters?.rendemenGKP ?? 0.5338) * 100).toFixed(2))
  );
  const [rendemenGKG, setRendemenGKG] = useState(
    Number(((initialParameters?.rendemenGKG ?? 0.6274) * 100).toFixed(2))
  );
  const [governmentFloorPrice, setGovernmentFloorPrice] = useState(
    initialParameters?.governmentFloorPriceGKP ?? 6500
  );
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await updateMutation.mutateAsync({
        orderExpiryHours: Number(defaultDurationHours),
        fairPriceToleranceDelta: Number(tolerancePercent) / 100,
        rendemenGKP: Number(rendemenGKP) / 100,
        rendemenGKG: Number(rendemenGKG) / 100,
        governmentFloorPriceGKP: Number(governmentFloorPrice),
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : "Gagal menyimpan perubahan parameter sistem."
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>
            Perubahan pengaturan berhasil disimpan dan langsung dicatat dalam log audit sistem.
          </span>
        </div>
      )}

      {saveError && (
        <div role="alert" className="p-4 rounded-2xl bg-destructive/10 text-destructive border border-destructive/30 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* 1. Durasi Tenggat Negosiasi */}
      <Card className="p-6 bg-card border border-border/80 shadow-xs rounded-2xl space-y-4">
        <div>
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span>1. Batas Waktu Respons Pesanan</span>
            <ParameterFieldHelp text="Pesanan baru yang belum disepakati melebihi batas jam ini akan otomatis berakhir dan stok gabah dikembalikan ke katalog." />
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Menentukan berapa jam waktu tunggu negosiasi untuk pesanan baru.
          </p>
        </div>

        <div className="max-w-xs space-y-1.5">
          <label className="text-xs font-bold text-foreground uppercase tracking-wider">
            Batas Waktu (Jam)
          </label>
          <div className="relative">
            <Input
              type="number"
              min="1"
              max="168"
              value={defaultDurationHours}
              onChange={(e) => setDefaultDurationHours(Number(e.target.value))}
              className="pr-12 text-sm tabular-nums font-bold"
              required
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
              Jam
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Nilai baku yang disarankan: 24 jam.</p>
        </div>
      </Card>

      {/* 2. Ambang Toleransi Lampu Harga */}
      <Card className="p-6 bg-card border border-border/80 shadow-xs rounded-2xl space-y-4">
        <div>
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Percent className="w-4 h-4 text-primary" />
            <span>2. Batas Toleransi Harga Di Bawah Acuan</span>
            <ParameterFieldHelp text="Jika harga tawaran lebih rendah dari batas bawah acuan melewati persentase ini, lampu harga berubah menjadi merah dan pengguna diminta konfirmasi khusus." />
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Mengatur batas peringatan merah pada bilah pengecekan harga wajar.
          </p>
        </div>

        <div className="max-w-xs space-y-1.5">
          <label className="text-xs font-bold text-foreground uppercase tracking-wider">
            Persentase Toleransi (%)
          </label>
          <div className="relative">
            <Input
              type="number"
              step="0.5"
              min="0.5"
              max="15"
              value={tolerancePercent}
              onChange={(e) => setTolerancePercent(Number(e.target.value))}
              className="pr-10 text-sm tabular-nums font-bold"
              required
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
              %
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Nilai baku sistem: 3%.</p>
        </div>
      </Card>

      {/* 3. Rendemen Konversi Standar */}
      <Card className="p-6 bg-card border border-border/80 shadow-xs rounded-2xl space-y-4">
        <div>
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" />
            <span>3. Rasio Rendemen Giling Gabah ke Beras</span>
            <ParameterFieldHelp text="Angka konversi standar BPS dan Bapanas untuk membandingkan harga beras menjadi nilai acuan gabah GKP dan GKG." />
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Nilai acuan rendemen pengeringan dan penggilingan gabah nasional.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider">
              Rendemen GKP (%)
            </label>
            <div className="relative">
              <Input
                type="number"
                step="0.01"
                min="30"
                max="75"
                value={rendemenGKP}
                onChange={(e) => setRendemenGKP(Number(e.target.value))}
                className="pr-10 text-sm tabular-nums font-bold"
                required
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                %
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Standar resmi: 53,38%.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider">
              Rendemen GKG (%)
            </label>
            <div className="relative">
              <Input
                type="number"
                step="0.01"
                min="40"
                max="85"
                value={rendemenGKG}
                onChange={(e) => setRendemenGKG(Number(e.target.value))}
                className="pr-10 text-sm tabular-nums font-bold"
                required
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                %
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Standar resmi: 62,74%.</p>
          </div>
        </div>
      </Card>

      {/* 4. HPP Gabah Pemerintah */}
      <Card className="p-6 bg-card border border-border/80 shadow-xs rounded-2xl space-y-4">
        <div>
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Sliders className="w-4 h-4 text-primary" />
            <span>4. Harga Pembelian Pemerintah (HPP Dasar)</span>
            <ParameterFieldHelp text="Batas harga dasar pemerintah dari Badan Pangan Nasional sebagai rujukan perlindungan pendapatan petani." />
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Batas dasar perlindungan harga gabah petani sesuai acuan nasional.
          </p>
        </div>

        <div className="max-w-xs space-y-1.5">
          <label className="text-xs font-bold text-foreground uppercase tracking-wider">
            HPP Gabah Kering Panen (Rp/kg)
          </label>
          <div className="relative">
            <Input
              type="number"
              step="50"
              min="4000"
              max="12000"
              value={governmentFloorPrice}
              onChange={(e) => setGovernmentFloorPrice(Number(e.target.value))}
              className="pr-14 text-sm tabular-nums font-bold"
              required
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
              Rp/kg
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Acuan Bapanas terkini: Rp6.500/kg.</p>
        </div>
      </Card>

      {/* Submit Action */}
      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={updateMutation.isPending}
          className="gap-2 font-bold text-xs shadow-xs px-6 cursor-pointer"
        >
          <Check className="w-4 h-4" />
          <span>{updateMutation.isPending ? "Menyimpan..." : "Simpan Perubahan Pengaturan"}</span>
        </Button>
      </div>
    </form>
  );
}

export default function AdminParametersPage() {
  const { data: parameters, isLoading } = useAdminParameters();

  return (
    <PageContainer>
      {/* Header & Breadcrumb */}
      <div>
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs text-muted-foreground mb-2"
        >
          <Link href="/admin" className="hover:text-foreground font-semibold">
            Pengawas Sistem
          </Link>
          <span className="text-muted-foreground/50">/</span>
          <span className="font-medium text-foreground">Pengaturan Acuan Sistem</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Pengaturan Batas Waktu &amp; Acuan Harga
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-3xl">
              Atur batas waktu respons pesanan, toleransi lampu harga wajar, rasio rendemen giling, dan acuan dasar HPP pemerintah.
            </p>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 text-xs font-semibold text-primary border border-primary/20 shrink-0">
            <Settings2 className="w-4 h-4 shrink-0" />
            <span>Konfigurasi Terpusat</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <SettingsFormSkeleton label="Memuat pengaturan sistem..." />
      ) : (
        <ParametersForm
          key={parameters?.lastUpdated ?? "initial"}
          initialParameters={parameters}
        />
      )}
    </PageContainer>
  );
}
