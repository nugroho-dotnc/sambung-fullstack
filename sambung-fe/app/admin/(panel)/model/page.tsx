"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/shared/page-container";
import { AsyncBoundary } from "@/components/shared/async-boundary";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
          <span className="font-medium text-foreground">Kelayakan Model Prakiraan</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Kelayakan &amp; Pengawasan Model Prakiraan AI
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-3xl">
              Ringkasan hasil uji historis bertahap ({evalData?.evaluationWindow || "2024–2026"}) serta simulator skenario langsung untuk pengawasan model prakiraan.
            </p>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 text-xs font-semibold text-primary border border-primary/20 shrink-0">
            <Cpu className="w-4 h-4 shrink-0" />
            <span>{evalData?.modelVersion || "Sambung Predict v1"}</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="evaluation" className="space-y-6">
        <TabsList>
          <TabsTrigger value="evaluation" className="gap-1.5 text-xs font-semibold cursor-pointer">
            <Activity className="w-3.5 h-3.5" />
            <span>Evaluasi &amp; Kelayakan Model</span>
          </TabsTrigger>
          <TabsTrigger value="what-if" className="gap-1.5 text-xs font-semibold cursor-pointer">
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Simulasi What-If (Live)</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="evaluation" className="space-y-6">
          <AsyncBoundary
            isLoading={evalQuery.isLoading}
            isError={evalQuery.isError}
            error={evalQuery.error}
            isEmpty={!evalQuery.isLoading && !evalQuery.isError && !evalData}
            onRetry={() => void evalQuery.refetch()}
          >
            {evalData && s2 && s4 && (
              <>
                {/* 4 Summary KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <Card className="p-4 rounded-2xl bg-card border-border/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-medium">
                        Wilayah Lolos Uji Penuh
                      </span>
                      <MetricInfoTooltip text="Setiap pasangan provinsi dan jangka waktu (2 atau 4 pekan) harus lolos syarat akurasi dan rentang wajar secara mandiri." />
                    </div>
                    <p className="text-2xl font-extrabold font-display tabular-nums text-emerald-700 dark:text-emerald-400">
                      {totalPass} / {totalUnits} Unit
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {s2.provincesPassingGate} prov (2 pekan) &bull; {s4.provincesPassingGate} prov (4 pekan)
                    </p>
                  </Card>

                  <Card className="p-4 rounded-2xl bg-card border-border/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-medium">
                        Skor Selisih vs Acuan Pekan Lalu
                      </span>
                      <MetricInfoTooltip text="Skor galat relatif (MASE). Nilai di bawah 0,90 berarti model lebih akurat dibanding sekadar menebak harga pekan lalu tetap sama." />
                    </div>
                    <p className="text-2xl font-extrabold font-display tabular-nums text-foreground">
                      {s2.meanMase.toFixed(3)}{" "}
                      <span className="text-xs font-normal text-muted-foreground">(2 pekan)</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      4 pekan: {s4.meanMase.toFixed(3)} &bull; 2025–2026: {s4.mase20252026.toFixed(3)}
                    </p>
                  </Card>

                  <Card className="p-4 rounded-2xl bg-card border-border/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-medium">
                        Ketepatan Rentang Wajar (80%)
                      </span>
                      <MetricInfoTooltip text="Seberapa sering harga aktual benar-benar jatuh di dalam pita perkiraan 80%. Target sistem berada di kisaran 75% hingga 85%." />
                    </div>
                    <p className="text-2xl font-extrabold font-display tabular-nums text-foreground">
                      {s2.meanCov80Pct.toFixed(1)}%{" "}
                      <span className="text-xs font-normal text-muted-foreground">(2 pekan)</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      4 pekan: {s4.meanCov80Pct.toFixed(1)}% (target{" "}
                      {evalData.gateCriteria.minCoveragePct}%–{evalData.gateCriteria.maxCoveragePct}%)
                    </p>
                  </Card>

                  <Card className="p-4 rounded-2xl bg-card border-border/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-medium">
                        Deteksi Lonjakan Harga Ekstrem
                      </span>
                      <MetricInfoTooltip text="Kemampuan model mendeteksi kenaikan harga tajam (5% tertinggi) sebelum terjadi, diukur dari sensitivitas tangkap lonjakan." />
                    </div>
                    <p className="text-2xl font-extrabold font-display tabular-nums text-foreground">
                      Skor Deteksi {spikeBlend?.nfr006Recall70?.rocAuc.toFixed(3) ?? "—"}
                    </p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      Daya tangkap {spikeBlend?.nfr006Recall70?.recallPct ?? "—"}% &bull; Ketepatan{" "}
                      {spikeBlend?.bestF1Balanced?.precisionPct ?? "—"}%
                    </p>
                  </Card>
                </div>

                {/* Baseline Comparison Table */}
                <Card className="rounded-2xl border border-border/80 overflow-hidden shadow-xs bg-card mb-6">
                  <CardHeader className="py-4 px-6 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary" />
                      <span>
                        Perbandingan Model Utama vs Pembanding Dasar (
                        {baselineHorizon === "2w" ? "2 Pekan" : "4 Pekan"})
                      </span>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {(["2w", "4w"] as const).map((key) => (
                        <Button
                          key={key}
                          size="sm"
                          variant={baselineHorizon === key ? "default" : "outline"}
                          onClick={() => setBaselineHorizon(key)}
                          className="h-7 text-xs px-2.5 cursor-pointer"
                        >
                          {key === "2w" ? "2 Pekan" : "4 Pekan"}
                        </Button>
                      ))}
                      <MetricInfoTooltip text="Model utama dibandingkan dengan tebakan sederhana agar terbukti memberi nilai tambah nyata." />
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-border/80 bg-muted/40 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          <th className="py-3 px-5">Model / Pembanding</th>
                          <th className="py-3 px-5 text-right">Rata-rata Selisih (Rp/kg)</th>
                          <th className="py-3 px-5 text-right">Selisih Persen</th>
                          <th className="py-3 px-5 text-right">Skor Galat Relatif</th>
                          <th className="py-3 px-5 text-right">Cakupan Rentang 80%</th>
                          <th className="py-3 px-5 text-center">Lolos Uji</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {compRows.map((row) => (
                          <tr key={row.model} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-5 font-bold text-foreground">{row.model}</td>
                            <td className="py-3 px-5 text-right tabular-nums">
                              Rp{row.meanMaeRp.toFixed(1)}
                            </td>
                            <td className="py-3 px-5 text-right tabular-nums">
                              {row.meanMapePct.toFixed(2)}%
                            </td>
                            <td className="py-3 px-5 text-right font-bold tabular-nums">
                              {row.meanMase.toFixed(3)}
                            </td>
                            <td className="py-3 px-5 text-right tabular-nums">
                              {row.intervalEvaluated === false
                                ? "—"
                                : `${row.cov80Pct.toFixed(1)}%`}
                            </td>
                            <td className="py-3 px-5 text-center font-semibold tabular-nums">
                              {row.passGateBoth}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>

                {/* Main Per-Province Gate Table */}
                <Card className="rounded-2xl border border-border/80 overflow-hidden shadow-xs bg-card mb-6">
                  <CardHeader className="py-4 px-6 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <CardTitle className="text-base font-bold text-foreground">
                      Hasil Uji Kelayakan per Wilayah ({filteredRows.length} baris)
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      {(["all", 2, 4] as const).map((hf) => (
                        <Button
                          key={String(hf)}
                          size="sm"
                          variant={horizonFilter === hf ? "default" : "outline"}
                          onClick={() => setHorizonFilter(hf)}
                          className="h-7 text-xs px-2.5 cursor-pointer"
                        >
                          {hf === "all" ? "Semua Jangka Waktu" : `${hf} Pekan`}
                        </Button>
                      ))}
                      {(["all", "pass", "fallback"] as const).map((sf) => (
                        <Button
                          key={sf}
                          size="sm"
                          variant={statusFilter === sf ? "default" : "outline"}
                          onClick={() => setStatusFilter(sf)}
                          className="h-7 text-xs px-2.5 cursor-pointer"
                        >
                          {sf === "all"
                            ? "Semua Status"
                            : sf === "pass"
                              ? "Prakiraan AI"
                              : "Acuan Aman"}
                        </Button>
                      ))}
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto max-h-[520px] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 bg-muted/95 backdrop-blur-xs z-10">
                        <tr className="border-b border-border/80 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          <th className="py-3 px-5">Provinsi</th>
                          <th className="py-3 px-5">Jangka Waktu</th>
                          <th className="py-3 px-5 text-right">Skor Relatif</th>
                          <th className="py-3 px-5 text-right">Selisih Harga</th>
                          <th className="py-3 px-5 text-right">Ketepatan Pita</th>
                          <th className="py-3 px-5 text-center">Status</th>
                          <th className="py-3 px-5">Metode Tayang</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {filteredRows.map((row, idx) => (
                          <tr
                            key={`${row.province}-${row.horizon}-${idx}`}
                            className="hover:bg-muted/30 transition-colors"
                          >
                            <td className="py-3 px-5 font-bold text-foreground whitespace-nowrap">
                              {row.province}
                            </td>
                            <td className="py-3 px-5 text-muted-foreground whitespace-nowrap">
                              {row.horizon}
                            </td>
                            <td className="py-3 px-5 font-bold text-right whitespace-nowrap tabular-nums">
                              <span
                                className={
                                  row.mase <= evalData.gateCriteria.maxMase
                                    ? "text-emerald-700 dark:text-emerald-400 font-bold"
                                    : "text-destructive font-bold"
                                }
                              >
                                {row.mase.toFixed(3)}
                              </span>
                            </td>
                            <td className="py-3 px-5 text-right whitespace-nowrap tabular-nums text-muted-foreground">
                              Rp{row.mae?.toFixed(0) ?? "-"} ({row.mapePct?.toFixed(2) ?? "-"}%)
                            </td>
                            <td className="py-3 px-5 font-bold text-right whitespace-nowrap tabular-nums">
                              {row.intervalCoverage}
                            </td>
                            <td className="py-3 px-5 text-center whitespace-nowrap">
                              <Badge
                                variant={!row.isFallback ? "default" : "secondary"}
                                className="text-[11px] font-bold"
                              >
                                {row.isFallback ? "Acuan Pekan Terakhir" : "Lulus Uji AI"}
                              </Badge>
                            </td>
                            <td className="py-3 px-5 whitespace-nowrap">
                              <span className="font-semibold text-foreground">
                                {row.activeMethod}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>

                {/* Quarantine Log */}
                <Card className="rounded-2xl border border-border/80 overflow-hidden shadow-xs bg-card mb-6">
                  <CardHeader className="py-4 px-6 border-b border-border/70">
                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                      <DatabaseZap className="w-4 h-4 text-primary" />
                      <span>Catatan Penyaringan Kualitas Data ({quarantineRows.length} Kejadian)</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-border/80 bg-muted/40 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          <th className="py-2.5 px-5">Tingkat Data</th>
                          <th className="py-2.5 px-5">Wilayah</th>
                          <th className="py-2.5 px-5">Periode</th>
                          <th className="py-2.5 px-5">Alasan Penyaringan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {quarantineRows.map((q, idx) => (
                          <tr key={idx} className="hover:bg-muted/30">
                            <td className="py-2.5 px-5 font-semibold">{q.layer}</td>
                            <td className="py-2.5 px-5">{q.provinceRaw}</td>
                            <td className="py-2.5 px-5 tabular-nums text-muted-foreground">
                              {q.period}
                            </td>
                            <td className="py-2.5 px-5 text-muted-foreground">{q.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>

                {/* Kebijakan Evaluasi & Fallback */}
                <Card className="rounded-2xl border-border/80 bg-card shadow-xs p-6 space-y-3">
                  <div className="flex items-center gap-2 text-foreground font-display font-bold text-sm">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span>Aturan Kelayakan Penayangan Prakiraan AI</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Setiap pasangan <strong>provinsi dan jangka waktu</strong> dinilai secara mandiri: hanya unit yang lebih akurat dari acuan pekan lalu dan memiliki ketepatan pita rentang wajar di kisaran {evalData.gateCriteria.minCoveragePct}%–{evalData.gateCriteria.maxCoveragePct}% yang menampilkan prakiraan AI penuh. Wilayah lain otomatis dialihkan ke <strong>Acuan Pekan Terakhir</strong> agar pengguna tidak menerima proyeksi yang kurang akurat.
                  </p>
                </Card>
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
