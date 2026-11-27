"use client";

import Link from "next/link";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAdminStats, useAdminAuditLogs } from "@/features/admin/hooks/use-admin";
import { useAiHealth } from "@/features/ai/hooks/use-ai-health";
import {
  ShieldCheck,
  Database,
  AlertTriangle,
  ScrollText,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

export default function AdminDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: logs, isLoading: logsLoading } = useAdminAuditLogs();
  const {
    data: aiHealth,
    isLoading: aiHealthLoading,
    isFetching: aiHealthFetching,
    refetch: refetchAiHealth,
  } = useAiHealth();

  const hasAnomaly = (stats?.flaggedOffers || 0) > 0;

  return (
    <PageContainer>
      <PageHeader
        title="Ringkasan Pengawasan & Tata Kelola"
        description="Pusat kendali operasional integritas data acuan harga gabah, parameter pasar, dan pemantauan transaksi pasokan digital."
        badge={
          <Badge
            variant="outline"
            className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 text-xs font-bold"
          >
            Akses Pengawas Sistem
          </Badge>
        }
      />

      {/* Grid 3 Kartu Metrik Pengawasan (Kaidah Clean UI Petani/Produsen) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Kartu 1: Status Integritas Acuan Harga */}
        <Card className="rounded-2xl border-border/80 bg-card shadow-xs">
          <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-semibold text-muted-foreground">
              Integritas Data Harga
            </span>
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs font-semibold"
            >
              {stats?.dataFreshnessStatus ? "Aktif & Valid" : "Memuat..."}
            </Badge>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-2.5">
            <div className="text-2xl sm:text-3xl font-extrabold font-display text-foreground flex items-baseline gap-1.5">
              <span>Bapanas &amp; BPS</span>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              Sinkronisasi data acuan pasar berkala
            </p>
            <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground font-medium">Layanan AI:</span>
                <Badge
                  variant="outline"
                  className={
                    aiHealthLoading
                      ? "bg-muted text-muted-foreground text-[10px] font-semibold"
                      : aiHealth?.ready
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-semibold"
                        : aiHealth?.status === "starting"
                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] font-semibold"
                          : "bg-destructive/10 text-destructive border-destructive/30 text-[10px] font-semibold"
                  }
                >
                  {aiHealthLoading
                    ? "Memeriksa..."
                    : aiHealth?.ready
                      ? `Siap${aiHealth.modelVersion ? ` (${aiHealth.modelVersion})` : ""}`
                      : aiHealth?.status === "starting"
                        ? "Memuat Model..."
                        : "Tidak Tersedia"}
                </Badge>
              </div>
              <button
                type="button"
                onClick={() => void refetchAiHealth()}
                disabled={aiHealthFetching}
                aria-label="Segarkan status layanan AI"
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-0.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${aiHealthFetching ? "animate-spin" : ""}`} />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Kartu 2: Pasokan & Komitmen Berjalan */}
        <Card className="rounded-2xl border-border/80 bg-card shadow-xs">
          <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-semibold text-muted-foreground">
              Pasokan Gabah Terdaftar
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {statsLoading ? "..." : `${stats?.totalOffers || 0} tawaran`}
            </span>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl sm:text-3xl font-extrabold font-display text-foreground tabular-nums">
              {(stats?.totalVolumeKg || 0).toLocaleString("id-ID")}{" "}
              <span className="text-base font-normal text-muted-foreground font-sans">kg</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 tabular-nums">
              <ScrollText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              {stats?.activeContracts || 0} kesepakatan pasokan aktif berjalan
            </p>
          </CardContent>
        </Card>

        {/* Kartu 3: Antrean Tinjauan Moderasi */}
        <Card className="rounded-2xl border-border/80 bg-card shadow-xs">
          <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-semibold text-muted-foreground">
              Perlu Tindakan Pengawas
            </span>
            <Badge
              variant="outline"
              className={
                hasAnomaly
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs font-semibold"
                  : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs font-semibold"
              }
            >
              {hasAnomaly ? "Perlu Tinjauan" : "Semua Aman"}
            </Badge>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div
              className={`text-2xl sm:text-3xl font-extrabold font-display tabular-nums ${
                hasAnomaly
                  ? "text-amber-700 dark:text-amber-400"
                  : "text-foreground"
              }`}
            >
              {statsLoading ? "..." : stats?.flaggedOffers || 0}{" "}
              <span className="text-base font-normal text-muted-foreground font-sans">
                tawaran
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <AlertTriangle
                className={`w-3.5 h-3.5 shrink-0 ${
                  hasAnomaly ? "text-amber-600" : "text-emerald-600"
                }`}
              />
              {hasAnomaly
                ? "Terdapat tawaran anomali menunggu catatan pengawas"
                : "Semua harga tawaran dalam toleransi wajar"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Antrean Prioritas Tindakan Pengawas (Menggantikan 6 Kartu Modul Redundan) */}
      <Card className="rounded-2xl border-border/80 bg-card p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-foreground">
                {hasAnomaly
                  ? "Antrean Moderasi Penawaran Petani"
                  : "Status Operasional Pasar Terkendali"}
              </h3>
              {hasAnomaly ? (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs">
                  {stats?.flaggedOffers} Memerlukan Catatan
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs">
                  Normal
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              {hasAnomaly
                ? "Terdapat tawaran dengan harga yang melampaui ambang batas toleransi pasar. Berikan catatan pengawas edukatif agar petani memahami situasi pasar tanpa membatalkan pesanan secara sepihak."
                : "Seluruh tawaran gabah yang dipublikasikan berada dalam rentang toleransi harga acuan yang valid. Parameter toleransi dan algoritma pengawasan pasar berjalan optimal."}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              className="min-h-11 text-xs cursor-pointer"
              render={<Link href="/admin/data-harga" />}
            >
              Observasi Data Harga
            </Button>
            <Button
              className={`min-h-11 text-xs font-semibold cursor-pointer ${
                hasAnomaly
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : ""
              }`}
              render={<Link href="/admin/moderasi" />}
            >
              <span>{hasAnomaly ? "Tinjau Tawaran Anomali" : "Buka Panel Moderasi"}</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Log Aktivitas Terakhir (Flat Rows / Tanpa Nested Cards) */}
      <Card className="rounded-2xl border-border/80 bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/80">
          <div>
            <h3 className="font-display font-bold text-base text-foreground">
              Aktivitas Bisnis & Pengawasan Terakhir
            </h3>
            <p className="text-xs text-muted-foreground">
              Catatan peristiwa transaksi, mutasi status, dan tindakan sistem terkini.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-xs font-semibold cursor-pointer"
            render={<Link href="/admin/log" />}
          >
            <span>Buka Semua Log</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </div>

        <div className="divide-y divide-border/60">
          {logsLoading ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              Memuat aktivitas transaksi...
            </p>
          ) : !logs || logs.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground space-y-1">
              <CheckCircle2 className="w-6 h-6 text-muted-foreground mx-auto mb-1 opacity-60" />
              <p className="font-medium text-foreground">Belum ada catatan aktivitas baru</p>
              <p>Seluruh riwayat sistem akan tercatat kronologis di sini.</p>
            </div>
          ) : (
            logs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{log.action}</span>
                    <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground border-border/80">
                      {log.actorRole}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">{log.details}</p>
                </div>
                <span className="text-xs text-muted-foreground font-medium shrink-0 tabular-nums">
                  {new Date(log.timestamp).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Catatan Wewenang Pengawas (Satu Layer Card Elegan) */}
      <Card className="rounded-2xl border-border/80 bg-muted/20 shadow-xs">
        <CardContent className="p-5 flex items-start gap-3.5">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-foreground">
              Prinsip & Batasan Otoritas Pengawas Sistem
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Sebagai pengawas sistem SAMBUNG, wewenang Anda berfokus pada pemantauan integritas data acuan harga pasar, kalibrasi parameter sistem, dan penyisipan catatan edukatif pada tawaran anomali. Pengawas sistem tidak memiliki wewenang mengintervensi atau mengubah harga kesepakatan secara sepihak, dan data nomor kontak petani maupun pembeli tetap tersamar secara permanen demi menjaga privasi pengguna.
            </p>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
