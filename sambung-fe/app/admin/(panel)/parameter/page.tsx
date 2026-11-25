"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useAdminParameters,
  useUpdateParameters,
} from "@/features/admin/hooks/use-admin";
import {
  Settings2,
  Sliders,
  Check,
  ShieldAlert,
  Percent,
  Clock,
  Scale,
  Sparkles,
} from "lucide-react";

export default function AdminParametersPage() {
  const { data: parameters, isLoading } = useAdminParameters();
  const updateMutation = useUpdateParameters();

  const [defaultDurationHours, setDefaultDurationHours] = useState(24);
  const [tolerancePercent, setTolerancePercent] = useState(3);
  const [rendemenGKP, setRendemenGKP] = useState(53.38);
  const [rendemenGKG, setRendemenGKG] = useState(63.0);
  const [governmentFloorPrice, setGovernmentFloorPrice] = useState(6000);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (parameters) {
      setDefaultDurationHours(parameters.orderExpiryHours || 24);
      setTolerancePercent((parameters.fairPriceToleranceDelta || 0.03) * 100);
      setRendemenGKP((parameters.rendemenGKP || 0.5338) * 100);
      setRendemenGKG((parameters.rendemenGKG || 0.63) * 100);
      setGovernmentFloorPrice(parameters.governmentFloorPriceGKP || 6000);
    }
  }, [parameters]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await updateMutation.mutateAsync({
      orderExpiryHours: Number(defaultDurationHours),
      fairPriceToleranceDelta: Number(tolerancePercent) / 100,
      rendemenGKP: Number(rendemenGKP) / 100,
      rendemenGKG: Number(rendemenGKG) / 100,
      governmentFloorPriceGKP: Number(governmentFloorPrice),
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 4000);
  };

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
          <span className="font-medium text-foreground">Parameter Operasional</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Pengaturan Parameter Operasional & Mesin
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-3xl">
              Kelola nilai default batas waktu negosiasi, ambang toleransi lampu harga spektrum,
              rasio konversi rendemen beras, dan batas dasar HPP pemerintah.
            </p>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 text-xs font-semibold text-primary border border-primary/20 shrink-0">
            <Settings2 className="w-4 h-4 shrink-0" />
            <span>Konfigurasi Terpusat</span>
          </div>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>
            Parameter operasional berhasil diperbarui dan dicatat ke dalam log audit sistem.
          </span>
        </div>
      )}

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Memuat konfigurasi parameter...</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Durasi Tenggat Negosiasi */}
          <Card className="p-6 bg-card border border-border/80 shadow-xs rounded-2xl space-y-4">
            <div>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span>1. Durasi Awal Tenggat Negosiasi Kontrak</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Batas waktu maksimal per putaran negosiasi sebelum pesanan dinyatakan kedaluwarsa otomatis (stok cadangan dikembalikan ke tawaran).
              </p>
            </div>

            <div className="max-w-xs space-y-1.5">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                Durasi Default (Jam)
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
              <p className="text-xs text-muted-foreground">Nilai standar yang disarankan: 24 jam.</p>
            </div>
          </Card>

          {/* 2. Ambang Toleransi Lampu Harga */}
          <Card className="p-6 bg-card border border-border/80 shadow-xs rounded-2xl space-y-4">
            <div>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Percent className="w-4 h-4 text-primary" />
                <span>2. Ambang Toleransi Lampu Harga Spektrum</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Nilai persentase delta (&delta;) yang menentukan zona transisi kuning (mendekati batas atas) dan oranye (mendekati batas bawah) pada bilah harga wajar.
              </p>
            </div>

            <div className="max-w-xs space-y-1.5">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                Toleransi Delta (&delta;) (%)
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
              <p className="text-xs text-muted-foreground">Nilai standar sistem: 3.0% (0.03).</p>
            </div>
          </Card>

          {/* 3. Rendemen Konversi Standar */}
          <Card className="p-6 bg-card border border-border/80 shadow-xs rounded-2xl space-y-4">
            <div>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Scale className="w-4 h-4 text-primary" />
                <span>3. Rasio Rendemen Konversi Gabah ke Beras</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Konversi teoritis yang digunakan untuk mengalkulasi batas harga wajar dari harga beras grosir nasional.
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
                <p className="text-xs text-muted-foreground">Standar: 53.38%.</p>
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
                <p className="text-xs text-muted-foreground">Standar: 63.0%.</p>
              </div>
            </div>
          </Card>

          {/* 4. HPP Gabah Pemerintah */}
          <Card className="p-6 bg-card border border-border/80 shadow-xs rounded-2xl space-y-4">
            <div>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />
                <span>4. Harga Pembelian Pemerintah (HPP Dasar)</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Batas dasar perlindungan harga petani yang ditetapkan regulator nasional (Badan Pangan Nasional).
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
              <p className="text-xs text-muted-foreground">Acuan Bapanas terkini: Rp6.000/kg.</p>
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
              <span>{updateMutation.isPending ? "Menyimpan..." : "Simpan Perubahan Parameter"}</span>
            </Button>
          </div>
        </form>
      )}
    </PageContainer>
  );
}
