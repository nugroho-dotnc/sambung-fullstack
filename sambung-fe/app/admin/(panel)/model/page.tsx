"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/shared/page-container";
import { AsyncBoundary } from "@/components/shared/async-boundary";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAdminModelEvaluation } from "@/features/admin/hooks/use-admin";
import { WhatIfSimulator } from "@/features/admin/components/what-if-simulator";
import { Cpu, ShieldCheck, Activity, DatabaseZap, Info, FlaskConical } from "lucide-react";

function MetricInfoTooltip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label="Penjelasan istilah evaluasi"
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

export default function AdminModelEvalPage() {
  const [horizonFilter, setHorizonFilter] = useState<"all" | 2 | 4>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pass" | "fallback">("all");
  const [baselineHorizon, setBaselineHorizon] = useState<"2w" | "4w">("2w");

  const evalQuery = useAdminModelEvaluation();
  const evalData = evalQuery.data;

  const filteredRows = useMemo(() => {
    const rows = evalData?.gateRows ?? [];
    return rows.filter((r) => {
      if (horizonFilter !== "all" && r.horizonWeeks !== horizonFilter) return false;
      if (statusFilter === "pass" && r.isFallback) return false;
      if (statusFilter === "fallback" && !r.isFallback) return false;
      return true;
    });
  }, [evalData?.gateRows, horizonFilter, statusFilter]);

  const s2 = evalData?.summaryByHorizon?.["2w"];
  const s4 = evalData?.summaryByHorizon?.["4w"];
  const totalPass = (s2?.provincesPassingGate ?? 0) + (s4?.provincesPassingGate ?? 0);
  const totalUnits = (s2?.provinceCount ?? 0) + (s4?.provinceCount ?? 0);

  const spikeBlend = evalData?.offlineSpikeNfr006?.spikeBlend;
  const compRows = evalData?.baselineComparison?.[baselineHorizon] ?? [];
  const quarantineRows = evalData?.quarantineLog ?? [];

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
            Kelayakan Model Prakiraan
          </span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-[28px] font-bold tracking-tight text-foreground">
              Kelayakan &amp; Pengawasan Model Prakiraan AI
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed max-w-3xl">
              Ringkasan hasil uji historis bertahap ({evalData?.evaluationWindow || "2024–2026"}) serta simulator skenario langsung untuk pengawasan model prakiraan.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md admin-brand-pill text-xs font-semibold shrink-0 self-start sm:self-auto">
            <Cpu className="w-4 h-4 shrink-0 text-white" aria-hidden="true" />
            <span>{evalData?.modelVersion || "Sambung Predict v1"}</span>
          </div>
        </div>
      </header>

      <Tabs defaultValue="evaluation" className="space-y-6">
        <TabsList variant="line" className="admin-tabs-list w-full justify-start border-b border-border gap-6 pb-0">
          <TabsTrigger value="evaluation" className="gap-1.5 pb-3 text-xs font-semibold cursor-pointer">
            <Activity className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Evaluasi &amp; Kelayakan Model</span>
          </TabsTrigger>
          <TabsTrigger value="what-if" className="gap-1.5 pb-3 text-xs font-semibold cursor-pointer">
            <FlaskConical className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Simulasi What-If (Live)</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="evaluation" className="space-y-7">
          <AsyncBoundary
            isLoading={evalQuery.isLoading}
            isError={evalQuery.isError}
            error={evalQuery.error}
            isEmpty={!evalQuery.isLoading && !evalQuery.isError && !evalData}
            onRetry={() => void evalQuery.refetch()}
          >
            {evalData && s2 && s4 && (
              <>
                {/* 4 Summary KPI Strip (Gestalt Common Region) */}
                <Card className="admin-surface p-0 gap-0 overflow-hidden">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
                    <div className="admin-kpi-cell p-6 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground font-semibold">
                          Wilayah Lolos Uji Penuh
                        </span>
                        <MetricInfoTooltip text="Setiap pasangan provinsi dan jangka waktu (2 atau 4 pekan) harus lolos syarat akurasi dan rentang wajar secara mandiri." />
                      </div>
                      <p className="text-2xl font-extrabold font-display tabular-nums text-[var(--admin-positive-text)]">
                        {totalPass} / {totalUnits} Unit
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s2.provincesPassingGate} prov (2 pekan) &bull; {s4.provincesPassingGate} prov (4 pekan)
                      </p>
                    </div>

                    <div className="admin-kpi-cell p-6 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground font-semibold">
                          Skor Selisih vs Pekan Lalu
                        </span>
                        <MetricInfoTooltip text="Skor galat relatif (MASE). Nilai di bawah 0,90 berarti model lebih akurat dibanding sekadar menebak harga pekan lalu tetap sama." />
                      </div>
                      <p className="text-2xl font-extrabold font-display tabular-nums text-foreground">
                        {s2.meanMase.toFixed(3)}{" "}
                        <span className="text-xs font-normal text-muted-foreground font-sans">
                          (2 pekan)
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        4 pekan: {s4.meanMase.toFixed(3)} &bull; 2025–2026: {s4.mase20252026.toFixed(3)}
                      </p>
                    </div>

                    <div className="admin-kpi-cell p-6 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground font-semibold">
                          Ketepatan Rentang Wajar (80%)
                        </span>
                        <MetricInfoTooltip text="Seberapa sering harga aktual benar-benar jatuh di dalam pita perkiraan 80%. Target sistem berada di kisaran 75% hingga 85%." />
                      </div>
                      <p className="text-2xl font-extrabold font-display tabular-nums text-foreground">
                        {s2.meanCov80Pct.toFixed(1)}%{" "}
                        <span className="text-xs font-normal text-muted-foreground font-sans">
                          (2 pekan)
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        4 pekan: {s4.meanCov80Pct.toFixed(1)}% (target{" "}
                        {evalData.gateCriteria.minCoveragePct}%–{evalData.gateCriteria.maxCoveragePct}%)
                      </p>
                    </div>

                    <div className="admin-kpi-cell p-6 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground font-semibold">
                          Deteksi Lonjakan Ekstrem
                        </span>
                        <MetricInfoTooltip text="Kemampuan model mendeteksi kenaikan harga tajam (5% tertinggi) sebelum terjadi, diukur dari sensitivitas tangkap lonjakan." />
                      </div>
                      <p className="text-2xl font-extrabold font-display tabular-nums text-[var(--admin-gold-text)]">
                        Skor {spikeBlend?.nfr006Recall70?.rocAuc.toFixed(3) ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        Daya tangkap {spikeBlend?.nfr006Recall70?.recallPct ?? "—"}% &bull; Ketepatan{" "}
                        {spikeBlend?.bestF1Balanced?.precisionPct ?? "—"}%
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Baseline Comparison Table */}
                <Card className="admin-surface p-0 gap-0 overflow-hidden">
                  <div className="px-6 py-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h2 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                      <Activity className="w-4 h-4 text-[var(--admin-info-text)]" aria-hidden="true" />
                      <span>
                        Perbandingan Model Utama vs Pembanding Dasar (
                        {baselineHorizon === "2w" ? "2 Pekan" : "4 Pekan"})
                      </span>
                    </h2>
                    <div className="flex items-center gap-2">
                      <div
                        role="group"
                        aria-label="Pilih jangka waktu perbandingan"
                        className="flex items-center gap-1.5"
                      >
                        {(["2w", "4w"] as const).map((key) => {
                          const active = baselineHorizon === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              aria-pressed={active}
                              onClick={() => setBaselineHorizon(key)}
                              className="admin-filter-btn min-h-8 rounded-lg text-xs px-3 font-semibold cursor-pointer"
                            >
                              {key === "2w" ? "2 Pekan" : "4 Pekan"}
                            </button>
                          );
                        })}
                      </div>
                      <MetricInfoTooltip text="Model utama dibandingkan dengan tebakan sederhana agar terbukti memberi nilai tambah nyata." />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="admin-table w-full text-left border-collapse text-[13px]">
                      <caption className="sr-only">
                        Perbandingan performa model utama terhadap pembanding dasar
                      </caption>
                      <thead>
                        <tr className="border-b border-border bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6">Model / Pembanding</th>
                          <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6 text-right">Rata-rata Selisih (Rp/kg)</th>
                          <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6 text-right">Selisih Persen</th>
                          <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6 text-right">Skor Galat Relatif</th>
                          <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6 text-right">Cakupan Rentang 80%</th>
                          <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6 text-center">Lolos Uji</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {compRows.map((row) => (
                          <tr key={row.model}>
                            <td className="py-4 px-5 first:pl-6 last:pr-6 font-semibold text-foreground">{row.model}</td>
                            <td className="py-4 px-5 first:pl-6 last:pr-6 text-right tabular-nums">
                              Rp{row.meanMaeRp.toFixed(1)}
                            </td>
                            <td className="py-4 px-5 first:pl-6 last:pr-6 text-right tabular-nums">
                              {row.meanMapePct.toFixed(2)}%
                            </td>
                            <td className="py-4 px-5 first:pl-6 last:pr-6 text-right font-bold tabular-nums">
                              {row.meanMase.toFixed(3)}
                            </td>
                            <td className="py-4 px-5 first:pl-6 last:pr-6 text-right tabular-nums">
                              {row.intervalEvaluated === false
                                ? "—"
                                : `${row.cov80Pct.toFixed(1)}%`}
                            </td>
                            <td className="py-4 px-5 first:pl-6 last:pr-6 text-center font-semibold tabular-nums">
                              {row.passGateBoth}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Main Per-Province Gate Table */}
                <Card className="admin-surface p-0 gap-0 overflow-hidden">
                  <div className="px-6 py-5 border-b border-border flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <h2 className="font-display text-base font-bold text-foreground">
                      Hasil Uji Kelayakan per Wilayah ({filteredRows.length} baris)
                    </h2>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <div
                        role="group"
                        aria-label="Filter jangka waktu"
                        className="flex flex-wrap items-center gap-1.5"
                      >
                        {(["all", 2, 4] as const).map((hf) => {
                          const active = horizonFilter === hf;
                          return (
                            <button
                              key={String(hf)}
                              type="button"
                              aria-pressed={active}
                              onClick={() => setHorizonFilter(hf)}
                              className="admin-filter-btn min-h-8 rounded-lg text-xs px-3 font-semibold cursor-pointer"
                            >
                              {hf === "all" ? "Semua Jangka Waktu" : `${hf} Pekan`}
                            </button>
                          );
                        })}
                      </div>

                      <span className="hidden sm:block w-px h-5 bg-border" aria-hidden="true" />

                      <div
                        role="group"
                        aria-label="Filter status kelayakan"
                        className="flex flex-wrap items-center gap-1.5"
                      >
                        {(["all", "pass", "fallback"] as const).map((sf) => {
                          const active = statusFilter === sf;
                          return (
                            <button
                              key={sf}
                              type="button"
                              aria-pressed={active}
                              onClick={() => setStatusFilter(sf)}
                              className="admin-filter-btn min-h-8 rounded-lg text-xs px-3 font-semibold cursor-pointer"
                            >
                              {sf === "all"
                                ? "Semua Status"
                                : sf === "pass"
                                  ? "Prakiraan AI"
                                  : "Acuan Aman"}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                    <table className="admin-table w-full text-left border-collapse text-[13px]">
                      <caption className="sr-only">
                        Hasil uji kelayakan model prakiraan per provinsi dan jangka waktu
                      </caption>
                      <thead className="sticky top-0 bg-muted z-10">
                        <tr className="border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6">Provinsi</th>
                          <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6">Jangka Waktu</th>
                          <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6 text-right">Skor Relatif</th>
                          <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6 text-right">Selisih Harga</th>
                          <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6 text-right">Ketepatan Pita</th>
                          <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6 text-center">Status</th>
                          <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6">Metode Tayang</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredRows.map((row, idx) => (
                          <tr key={`${row.province}-${row.horizon}-${idx}`}>
                            <td className="py-4 px-5 first:pl-6 last:pr-6 font-semibold text-foreground whitespace-nowrap">
                              {row.province}
                            </td>
                            <td className="py-4 px-5 first:pl-6 last:pr-6 text-muted-foreground whitespace-nowrap">
                              {row.horizon}
                            </td>
                            <td className="py-4 px-5 first:pl-6 last:pr-6 font-bold text-right whitespace-nowrap tabular-nums">
                              <span
                                className={
                                  row.mase <= evalData.gateCriteria.maxMase
                                    ? "text-[var(--admin-positive-text)] font-bold"
                                    : "text-[var(--admin-error-text)] font-bold"
                                }
                              >
                                {row.mase.toFixed(3)}
                              </span>
                            </td>
                            <td className="py-4 px-5 first:pl-6 last:pr-6 text-right whitespace-nowrap tabular-nums text-muted-foreground">
                              Rp{row.mae?.toFixed(0) ?? "-"} ({row.mapePct?.toFixed(2) ?? "-"}%)
                            </td>
                            <td className="py-4 px-5 first:pl-6 last:pr-6 font-semibold text-right whitespace-nowrap tabular-nums">
                              {row.intervalCoverage}
                            </td>
                            <td className="py-4 px-5 first:pl-6 last:pr-6 text-center whitespace-nowrap">
                              <Badge
                                variant="outline"
                                className={`rounded-md px-2 py-0.5 text-xs font-semibold ${!row.isFallback
                                  ? "status-success"
                                  : "bg-muted text-foreground border-transparent"
                                  }`}
                              >
                                {row.isFallback ? "Acuan Pekan Terakhir" : "Lulus Uji AI"}
                              </Badge>
                            </td>
                            <td className="py-4 px-5 first:pl-6 last:pr-6 whitespace-nowrap">
                              <span className="font-medium text-foreground">
                                {row.activeMethod}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Quarantine Log */}
                <Card className="admin-surface p-0 gap-0 overflow-hidden">
                  <div className="px-6 py-5 border-b border-border">
                    <h2 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                      <DatabaseZap className="w-4 h-4 text-[var(--admin-gold-text)]" aria-hidden="true" />
                      <span>Catatan Penyaringan Kualitas Data ({quarantineRows.length} Kejadian)</span>
                    </h2>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="admin-table w-full text-left border-collapse text-[13px]">
                      <caption className="sr-only">
                        Catatan penyaringan kualitas data historis model
                      </caption>
                      <thead>
                        <tr className="border-b border-border bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6">Tingkat Data</th>
                          <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6">Wilayah</th>
                          <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6">Periode</th>
                          <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6">Alasan Penyaringan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {quarantineRows.map((q, idx) => (
                          <tr key={idx}>
                            <td className="py-3.5 px-5 first:pl-6 last:pr-6 font-semibold text-foreground">{q.layer}</td>
                            <td className="py-3.5 px-5 first:pl-6 last:pr-6 text-foreground">{q.provinceRaw}</td>
                            <td className="py-3.5 px-5 first:pl-6 last:pr-6 tabular-nums text-muted-foreground">
                              {q.period}
                            </td>
                            <td className="py-3.5 px-5 first:pl-6 last:pr-6 text-muted-foreground">{q.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Kebijakan Evaluasi & Fallback (Figure-Ground Direndahkan) */}
                <section
                  aria-label="Aturan kelayakan penayangan prakiraan AI"
                  className="admin-editorial-note flex items-start gap-3"
                >
                  <ShieldCheck
                    className="w-4 h-4 text-[var(--admin-info-text)] shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-foreground">
                      Aturan Kelayakan Penayangan Prakiraan AI
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed max-w-4xl">
                      Setiap pasangan <strong>provinsi dan jangka waktu</strong> dinilai secara mandiri: hanya unit yang lebih akurat dari acuan pekan lalu dan memiliki ketepatan pita rentang wajar di kisaran {evalData.gateCriteria.minCoveragePct}%–{evalData.gateCriteria.maxCoveragePct}% yang menampilkan prakiraan AI penuh. Wilayah lain otomatis dialihkan ke <strong>Acuan Pekan Terakhir</strong> agar pengguna tidak menerima proyeksi yang kurang akurat.
                    </p>
                  </div>
                </section>
              </>
            )}
          </AsyncBoundary>
        </TabsContent>

        <TabsContent value="what-if">
          <WhatIfSimulator />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
