"use client";

import { useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/shared/page-container";
import { SettingsFormSkeleton } from "@/components/shared/page-skeletons";
import { Card } from "@/components/ui/card";
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
            className="size-8 rounded-md inline-flex items-center justify-center text-muted-foreground hover:text-[var(--admin-gold-text)] hover:bg-muted active:scale-95 transition-all cursor-pointer"
          >
            <Info className="w-4 h-4" aria-hidden="true" />
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
        <div
          role="status"
          aria-live="polite"
          className="px-4 py-3.5 rounded-lg status-success text-xs font-semibold flex items-center gap-2.5"
        >
          <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>
            Perubahan pengaturan berhasil disimpan dan langsung dicatat dalam log audit sistem.
          </span>
        </div>
      )}

      {saveError && (
        <div
          role="alert"
          className="px-4 py-3.5 rounded-lg status-error text-xs font-semibold flex items-center gap-2.5"
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Ledger Parameter Sistem Terpadu (Gestalt Common Region & Continuity) */}
      <Card className="admin-surface p-0 gap-0 overflow-hidden divide-y divide-border">
        {/* 1. Durasi Tenggat Negosiasi */}
        <div className="admin-field-row p-6 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
          <div className="lg:col-span-7 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tabular-nums text-[var(--admin-gold-text)]">01</span>
              <Clock className="w-4 h-4 text-[var(--admin-info-text)] shrink-0" aria-hidden="true" />
              <h2 className="font-display text-base font-bold text-foreground">
                Batas Waktu Respons Pesanan
              </h2>
              <ParameterFieldHelp text="Pesanan baru yang belum disepakati melebihi batas jam ini akan otomatis berakhir dan stok gabah dikembalikan ke katalog." />
            </div>
            <p className="text-xs sm:text-[13px] text-muted-foreground leading-relaxed">
              Menentukan berapa jam waktu tunggu negosiasi untuk pesanan baru sebelum kedaluwarsa otomatis.
            </p>
          </div>

          <div className="lg:col-span-5 space-y-1.5">
            <label
              htmlFor="order-expiry-hours"
              className="block text-xs font-semibold text-foreground"
            >
              Batas Waktu (Jam)
            </label>
            <div className="relative max-w-xs">
              <Input
                id="order-expiry-hours"
                type="number"
                min="1"
                max="168"
                value={defaultDurationHours}
                onChange={(e) => setDefaultDurationHours(Number(e.target.value))}
                aria-describedby="order-expiry-help"
                className="min-h-10 pr-12 rounded-lg text-sm tabular-nums font-semibold"
                required
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                Jam
              </span>
            </div>
            <p id="order-expiry-help" className="text-xs text-muted-foreground">
              Nilai baku yang disarankan: 24 jam.
            </p>
          </div>
        </div>

        {/* 2. Ambang Toleransi Lampu Harga */}
        <div className="admin-field-row p-6 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
          <div className="lg:col-span-7 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tabular-nums text-[var(--admin-gold-text)]">02</span>
              <Percent className="w-4 h-4 text-[var(--admin-info-text)] shrink-0" aria-hidden="true" />
              <h2 className="font-display text-base font-bold text-foreground">
                Batas Toleransi Harga Di Bawah Acuan
              </h2>
              <ParameterFieldHelp text="Jika harga tawaran lebih rendah dari batas bawah acuan melewati persentase ini, lampu harga berubah menjadi merah dan pengguna diminta konfirmasi khusus." />
            </div>
            <p className="text-xs sm:text-[13px] text-muted-foreground leading-relaxed">
              Mengatur batas peringatan merah pada bilah pengecekan harga wajar di ruang transaksi.
            </p>
          </div>

          <div className="lg:col-span-5 space-y-1.5">
            <label
              htmlFor="fair-price-tolerance"
              className="block text-xs font-semibold text-foreground"
            >
              Persentase Toleransi (%)
            </label>
            <div className="relative max-w-xs">
              <Input
                id="fair-price-tolerance"
                type="number"
                step="0.5"
                min="0.5"
                max="25"
                value={tolerancePercent}
                onChange={(e) => setTolerancePercent(Number(e.target.value))}
                aria-describedby="fair-price-tolerance-help"
                className="min-h-10 pr-10 rounded-lg text-sm tabular-nums font-semibold"
                required
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                %
              </span>
            </div>
            <p id="fair-price-tolerance-help" className="text-xs text-muted-foreground">
              Nilai baku sistem: 3%.
            </p>
          </div>
        </div>

        {/* 3. Rendemen Konversi Standar */}
        <div className="admin-field-row p-6 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
          <div className="lg:col-span-7 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tabular-nums text-[var(--admin-gold-text)]">03</span>
              <Scale className="w-4 h-4 text-[var(--admin-info-text)] shrink-0" aria-hidden="true" />
              <h2 className="font-display text-base font-bold text-foreground">
                Rasio Rendemen Giling Gabah ke Beras
              </h2>
              <ParameterFieldHelp text="Angka konversi standar BPS dan Bapanas untuk membandingkan harga beras menjadi nilai acuan gabah GKP dan GKG." />
            </div>
            <p className="text-xs sm:text-[13px] text-muted-foreground leading-relaxed">
              Nilai acuan rendemen pengeringan dan penggilingan gabah nasional untuk kalkulasi harga wajar.
            </p>
          </div>

          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="rendemen-gkp"
                className="block text-xs font-semibold text-foreground"
              >
                Rendemen GKP (%)
              </label>
              <div className="relative">
                <Input
                  id="rendemen-gkp"
                  type="number"
                  step="0.01"
                  min="40"
                  max="75"
                  value={rendemenGKP}
                  onChange={(e) => setRendemenGKP(Number(e.target.value))}
                  aria-describedby="rendemen-gkp-help"
                  className="min-h-10 pr-10 rounded-lg text-sm tabular-nums font-semibold"
                  required
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                  %
                </span>
              </div>
              <p id="rendemen-gkp-help" className="text-xs text-muted-foreground">
                Standar resmi: 53,38%.
              </p>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="rendemen-gkg"
                className="block text-xs font-semibold text-foreground"
              >
                Rendemen GKG (%)
              </label>
              <div className="relative">
                <Input
                  id="rendemen-gkg"
                  type="number"
                  step="0.01"
                  min="40"
                  max="75"
                  value={rendemenGKG}
                  onChange={(e) => setRendemenGKG(Number(e.target.value))}
                  aria-describedby="rendemen-gkg-help"
                  className="min-h-10 pr-10 rounded-lg text-sm tabular-nums font-semibold"
                  required
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                  %
                </span>
              </div>
              <p id="rendemen-gkg-help" className="text-xs text-muted-foreground">
                Standar resmi: 62,74%.
              </p>
            </div>
          </div>
        </div>

        {/* 4. HPP Gabah Pemerintah */}
        <div className="admin-field-row p-6 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
          <div className="lg:col-span-7 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tabular-nums text-[var(--admin-gold-text)]">04</span>
              <Sliders className="w-4 h-4 text-[var(--admin-info-text)] shrink-0" aria-hidden="true" />
              <h2 className="font-display text-base font-bold text-foreground">
                Harga Pembelian Pemerintah (HPP Dasar)
              </h2>
              <ParameterFieldHelp text="Batas harga dasar pemerintah dari Badan Pangan Nasional sebagai rujukan perlindungan pendapatan petani." />
            </div>
            <p className="text-xs sm:text-[13px] text-muted-foreground leading-relaxed">
              Batas dasar perlindungan harga gabah petani sesuai acuan resmi nasional.
            </p>
          </div>

          <div className="lg:col-span-5 space-y-1.5">
            <label
              htmlFor="government-floor-price"
              className="block text-xs font-semibold text-foreground"
            >
              HPP Gabah Kering Panen (Rp/kg)
            </label>
            <div className="relative max-w-xs">
              <Input
                id="government-floor-price"
                type="number"
                step="50"
                min="3000"
                max="20000"
                value={governmentFloorPrice}
                onChange={(e) => setGovernmentFloorPrice(Number(e.target.value))}
                aria-describedby="government-floor-price-help"
                className="min-h-10 pr-14 rounded-lg text-sm tabular-nums font-semibold"
                required
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                Rp/kg
              </span>
            </div>
            <p id="government-floor-price-help" className="text-xs text-muted-foreground">
              Acuan Bapanas terkini: Rp6.500/kg.
            </p>
          </div>
        </div>

        {/* Submit Footer */}
        <div className="px-6 sm:px-7 py-5 bg-muted/40 flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            Setiap perubahan langsung membersihkan cache acuan harga aktif dan dicatat di log audit.
          </p>
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            className="admin-cta min-h-10 rounded-lg gap-2 font-semibold text-xs px-5 cursor-pointer"
          >
            <Check className="w-4 h-4" aria-hidden="true" />
            <span>{updateMutation.isPending ? "Menyimpan..." : "Simpan Perubahan Pengaturan"}</span>
          </Button>
        </div>
      </Card>
    </form>
  );
}

export default function AdminParametersPage() {
  const { data: parameters, isLoading } = useAdminParameters();

  return (
    <PageContainer className="py-7 sm:py-9 space-y-7 sm:space-y-8">
      {/* Header & Breadcrumb */}
      <header className="border-b border-border pb-6">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs text-muted-foreground mb-2.5"
        >
          <Link href="/admin" className="admin-breadcrumb-link font-semibold">
            Pengawas Sistem
          </Link>
          <span className="text-muted-foreground/60" aria-hidden="true">/</span>
          <span aria-current="page" className="font-medium text-foreground">
            Pengaturan Acuan Sistem
          </span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-[28px] font-bold tracking-tight text-foreground">
              Pengaturan Batas Waktu &amp; Acuan Harga
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed max-w-3xl">
              Atur batas waktu respons pesanan, toleransi lampu harga wajar, rasio rendemen giling, dan acuan dasar HPP pemerintah.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md admin-brand-pill text-xs font-semibold shrink-0 self-start sm:self-auto">
            <Settings2 className="w-4 h-4 shrink-0 text-white" aria-hidden="true" />
            <span>Konfigurasi Terpusat</span>
          </div>
        </div>
      </header>

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
