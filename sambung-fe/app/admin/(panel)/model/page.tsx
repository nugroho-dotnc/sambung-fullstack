"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/shared/page-container";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ModelEvaluationRecord } from "@/features/admin/domain/admin-types";
import modelEvalJson from "@/data/ai/model_evaluation.json";
import { Cpu, ShieldCheck, Activity, DatabaseZap } from "lucide-react";

const MODEL_EVALUATION_ROWS: ModelEvaluationRecord[] = modelEvalJson.gateRows.map((r) => ({
  province: r.province,
  horizon: (r.horizonWeeks === 4 ? "4 Pekan" : "2 Pekan") as "2 Pekan" | "4 Pekan",
  horizonWeeks: r.horizonWeeks,
  mase: r.mase,
  mae: r.mae,
  mapePct: r.mapePct,
  intervalCoverage: r.intervalCoverage,
  cov80Pct: r.cov80Pct,
  nEval: r.nEval,
  status: (r.isFallback ? "Fallback Baseline" : "Lulus Target") as
    | "Lulus Target"
    | "Fallback Baseline",
  activeMethod: r.activeMethod,
  isFallback: r.isFallback,
}));

export default function AdminModelEvalPage() {
  const [horizonFilter, setHorizonFilter] = useState<"all" | 2 | 4>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pass" | "fallback">("all");

  const filteredRows = useMemo(() => {
    return MODEL_EVALUATION_ROWS.filter((r) => {
      if (horizonFilter !== "all" && r.horizonWeeks !== horizonFilter) return false;
      if (statusFilter === "pass" && r.isFallback) return false;
      if (statusFilter === "fallback" && !r.isFallback) return false;
      return true;
    });
  }, [horizonFilter, statusFilter]);

  const s2 = modelEvalJson.summaryByHorizon["2w"];
  const s4 = modelEvalJson.summaryByHorizon["4w"];
  const totalPass = s2.provs_pass_gate_both + s4.provs_pass_gate_both;
  const totalUnits = s2.n_provinces + s4.n_provinces;

  const spikeBlend = modelEvalJson.offlineSpikeNfr006?.spike_blend;
  const comp2w = modelEvalJson.baselineComparison.produsen_2w;
  const quarantineRows = modelEvalJson.quarantineLog || [];

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
          <span className="font-medium text-foreground">Evaluasi Model AI</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Evaluasi &amp; Gerbang Publikasi Model AI
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-3xl">
              Hasil uji {modelEvalJson.walkForwardFolds}-fold Walk-Forward Backtesting ({modelEvalJson.evaluationWindow}) per unit (provinsi, horizon) terhadap syarat akurasi &amp; cakupan pita keyakinan sebelum publikasi.
            </p>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 text-xs font-semibold text-primary border border-primary/20 shrink-0">
            <Cpu className="w-4 h-4 shrink-0" />
            <span>{modelEvalJson.walkForwardFolds}-Fold Walk-Forward</span>
          </div>
        </div>
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 rounded-2xl bg-card border-border/80 space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Unit Lolos Gerbang Penuh</span>
          <p className="text-2xl font-extrabold font-display tabular-nums text-emerald-700 dark:text-emerald-400">
            {totalPass} / {totalUnits} Unit
          </p>
          <p className="text-[11px] text-muted-foreground">
            {s2.provs_pass_gate_both} prov (2w) &bull; {s4.provs_pass_gate_both} prov (4w)
          </p>
        </Card>

        <Card className="p-4 rounded-2xl bg-card border-border/80 space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Rata-rata MASE (vs Naive)</span>
          <p className="text-2xl font-extrabold font-display tabular-nums text-foreground">
            {s2.mean_mase.toFixed(3)} <span className="text-xs font-normal text-muted-foreground">(2w)</span>
          </p>
          <p className="text-[11px] text-muted-foreground tabular-nums">
            Horizon 4w: {s4.mean_mase.toFixed(3)} &bull; 2025–2026: {s4.mase_2025_2026.toFixed(3)}
          </p>
        </Card>

        <Card className="p-4 rounded-2xl bg-card border-border/80 space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Cakupan Pita Keyakinan 80%</span>
          <p className="text-2xl font-extrabold font-display tabular-nums text-foreground">
            {s2.mean_cov_80_pct.toFixed(1)}% <span className="text-xs font-normal text-muted-foreground">(2w)</span>
          </p>
          <p className="text-[11px] text-muted-foreground tabular-nums">
            Horizon 4w: {s4.mean_cov_80_pct.toFixed(1)}% (target SRS 75%–85%)
          </p>
        </Card>

        <Card className="p-4 rounded-2xl bg-card border-border/80 space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Uji Lonjakan Offline (Ambang P95)</span>
          <p className="text-2xl font-extrabold font-display tabular-nums text-foreground">
            ROC-AUC {spikeBlend?.nfr006_recall70.roc_auc.toFixed(3) ?? "0.840"}
          </p>
          <p className="text-[11px] text-muted-foreground tabular-nums">
            Recall {spikeBlend?.nfr006_recall70.recall_pct ?? 80.5}% &bull; Prec seimbang {spikeBlend?.best_f1_balanced.precision_pct ?? 36.8}%
          </p>
        </Card>
      </div>

      {/* Baseline Comparison Table */}
      <Card className="rounded-2xl border border-border/80 overflow-hidden shadow-xs bg-card mb-6">
        <CardHeader className="py-4 px-6 border-b border-border/70">
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <span>Perbandingan Model Juara vs 3 Baseline Wajib SRS (Produsen 2 Pekan)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/80 bg-muted/40 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-5">Model / Baseline</th>
                <th className="py-3 px-5 text-right">MAE (Rp/kg)</th>
                <th className="py-3 px-5 text-right">MAPE</th>
                <th className="py-3 px-5 text-right">Mean MASE</th>
                <th className="py-3 px-5 text-right">Cakupan 80%</th>
                <th className="py-3 px-5 text-center">Lolos Gerbang</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {comp2w.map((row) => (
                <tr key={row.model} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-5 font-bold text-foreground">{row.model}</td>
                  <td className="py-3 px-5 text-right tabular-nums">Rp{row.mean_mae.toFixed(1)}</td>
                  <td className="py-3 px-5 text-right tabular-nums">{row.mean_mape_pct.toFixed(2)}%</td>
                  <td className="py-3 px-5 text-right font-bold tabular-nums">{row.mean_mase.toFixed(3)}</td>
                  <td className="py-3 px-5 text-right tabular-nums">{row.cov_80_pct.toFixed(1)}%</td>
                  <td className="py-3 px-5 text-center font-semibold tabular-nums">{row.pass_gate_both}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Main 50-Row Per-Province Gate Table */}
      <Card className="rounded-2xl border border-border/80 overflow-hidden shadow-xs bg-card mb-6">
        <CardHeader className="py-4 px-6 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-base font-bold text-foreground">
            Hasil Uji Backtesting per Unit Wilayah ({filteredRows.length} baris)
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {(["all", 2, 4] as const).map((hf) => (
              <Button
                key={String(hf)}
                size="sm"
                variant={horizonFilter === hf ? "default" : "outline"}
                onClick={() => setHorizonFilter(hf)}
                className="h-7 text-xs px-2.5"
              >
                {hf === "all" ? "Semua Horizon" : `${hf} Pekan`}
              </Button>
            ))}
            {(["all", "pass", "fallback"] as const).map((sf) => (
              <Button
                key={sf}
                size="sm"
                variant={statusFilter === sf ? "default" : "outline"}
                onClick={() => setStatusFilter(sf)}
                className="h-7 text-xs px-2.5"
              >
                {sf === "all" ? "Semua Status" : sf === "pass" ? "Lulus AI" : "Fallback"}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto max-h-[520px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-muted/95 backdrop-blur-xs z-10">
              <tr className="border-b border-border/80 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-5">Provinsi</th>
                <th className="py-3 px-5">Horizon</th>
                <th className="py-3 px-5 text-right">MASE</th>
                <th className="py-3 px-5 text-right">MAE / MAPE</th>
                <th className="py-3 px-5 text-right">Pita 80%</th>
                <th className="py-3 px-5 text-center">Status</th>
                <th className="py-3 px-5">Metode Publikasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredRows.map((row, idx) => (
                <tr key={`${row.province}-${row.horizon}-${idx}`} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-5 font-bold text-foreground whitespace-nowrap">
                    {row.province}
                  </td>
                  <td className="py-3 px-5 text-muted-foreground whitespace-nowrap">
                    {row.horizon}
                  </td>
                  <td className="py-3 px-5 font-bold text-right whitespace-nowrap tabular-nums">
                    <span
                      className={
                        row.mase <= 0.9
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
                      {row.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-5 whitespace-nowrap">
                    <span className="font-semibold text-foreground">{row.activeMethod}</span>
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
            <span>Log Karantina Kualitas Data Nyata ({quarantineRows.length} Kejadian)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/80 bg-muted/40 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <th className="py-2.5 px-5">Lapisan</th>
                <th className="py-2.5 px-5">Wilayah</th>
                <th className="py-2.5 px-5">Periode</th>
                <th className="py-2.5 px-5">Alasan Karantina</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {quarantineRows.map((q, idx) => (
                <tr key={idx} className="hover:bg-muted/30">
                  <td className="py-2.5 px-5 font-semibold">{q.layer}</td>
                  <td className="py-2.5 px-5">{q.province_raw}</td>
                  <td className="py-2.5 px-5 tabular-nums text-muted-foreground">{q.period}</td>
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
          <span>Aturan Ambang Batas Gerbang Publikasi AI</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Sesuai aturan evaluasi per wilayah (tanpa kelolosan rata-rata agregat), setiap unit <strong>(provinsi, horizon)</strong> dinilai mandiri: wajib mencetak skor <strong>MASE &le; 0,90</strong> terhadap baseline Naive pekan lalu dan <strong>cakupan pita keyakinan 80% di rentang 75%–85%</strong>. Unit yang belum memenuhi ambang otomatis dialihkan ke <strong>Fallback Baseline Aman</strong> dengan SHAP disembunyikan.
        </p>
      </Card>
    </PageContainer>
  );
}
