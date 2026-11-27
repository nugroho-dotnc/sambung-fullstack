"use client";

import Link from "next/link";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
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
    <PageContainer className="py-7 sm:py-9 space-y-7 sm:space-y-8">
      <PageHeader
        title="Ringkasan Pengawasan & Tata Kelola"
        description="Pusat kendali operasional integritas data acuan harga gabah, parameter pasar, dan pemantauan transaksi pasokan digital."
        className="pb-6 border-border"
        badge={
          <Badge
            variant="outline"
            className="admin-brand-pill rounded-md px-2.5 py-1 text-xs font-semibold"
          >
            Akses Pengawas Sistem
          </Badge>
        }
      />

      {/* Strip Metrik Pengawasan Terpadu (Gestalt Common Region & Continuity) */}
      <Card className="admin-surface p-0 gap-0 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
          {/* Sel 1: Status Integritas Acuan Harga & AI */}
          <div className="admin-kpi-cell p-6 sm:p-7 flex flex-col justify-between gap-4">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  Integritas Data Harga
                </span>
                <Badge
                  variant="outline"
                  className={
                    stats?.dataFreshnessStatus
                      ? "status-success rounded-md px-2 py-0.5 text-xs font-semibold"
                      : "bg-muted text-foreground border-transparent rounded-md px-2 py-0.5 text-xs font-semibold"
                  }
                >
                  {stats?.dataFreshnessStatus ? "Aktif & Valid" : "Memuat..."}
                </Badge>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-display text-foreground tracking-tight">
                Bapanas &amp; BPS
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Database
                  className="w-3.5 h-3.5 text-[var(--admin-positive-text)] shrink-0"
                  aria-hidden="true"
                />
                <span>Sinkronisasi data acuan pasar berkala</span>
              </p>
            </div>

            <div className="pt-3.5 border-t border-border flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-muted-foreground font-medium">Layanan AI:</span>
                <Badge
                  variant="outline"
                  className={`rounded-md px-2 py-0.5 text-xs font-semibold inline-flex items-center gap-1.5 ${aiHealthLoading
                      ? "bg-muted text-foreground border-transparent"
                      : aiHealth?.ready
                        ? "status-success"
                        : aiHealth?.status === "starting"
                          ? "status-warning"
                          : "status-error"
                    }`}
                >
                  {!aiHealthLoading && aiHealth?.ready && (
                    <span className="admin-live-dot bg-[#78B000]" aria-hidden="true" />
                  )}
                  {!aiHealthLoading && aiHealth?.status === "starting" && (
                    <span className="admin-live-dot bg-[#E7A303]" aria-hidden="true" />
                  )}
                  <span>
                    {aiHealthLoading
                      ? "Memeriksa..."
                      : aiHealth?.ready
                        ? `Siap${aiHealth.modelVersion ? ` (${aiHealth.modelVersion})` : ""}`
                        : aiHealth?.status === "starting"
                          ? "Memuat Model..."
                          : "Tidak Tersedia"}
                  </span>
                </Badge>
              </div>
              <button
                type="button"
                onClick={() => void refetchAiHealth()}
                disabled={aiHealthFetching}
                aria-label="Segarkan status layanan AI"
                className="size-8 rounded-md inline-flex items-center justify-center text-muted-foreground hover:text-[var(--admin-gold-text)] hover:bg-muted active:scale-95 transition-all cursor-pointer disabled:opacity-50 shrink-0"
              >
                <RefreshCw
                  className={`w-4 h-4 ${aiHealthFetching ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>

          {/* Sel 2: Pasokan & Komitmen Berjalan */}
          <div className="admin-kpi-cell p-6 sm:p-7 flex flex-col justify-between gap-4">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  Pasokan Gabah Terdaftar
                </span>
                <span className="text-xs font-semibold text-[var(--admin-gold-text)] tabular-nums">
                  {statsLoading ? "..." : `${stats?.totalOffers || 0} tawaran`}
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-display text-foreground tabular-nums tracking-tight">
                {(stats?.totalVolumeKg || 0).toLocaleString("id-ID")}{" "}
                <span className="text-base font-normal text-muted-foreground font-sans">kg</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 tabular-nums pt-3.5 border-t border-border">
              <ScrollText className="w-3.5 h-3.5 text-[var(--admin-info-text)] shrink-0" aria-hidden="true" />
              <span>{stats?.activeContracts || 0} kesepakatan pasokan aktif berjalan</span>
            </p>
          </div>

          {/* Sel 3: Antrean Tinjauan Moderasi */}
          <div className="admin-kpi-cell p-6 sm:p-7 flex flex-col justify-between gap-4">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  Perlu Tindakan Pengawas
                </span>
                <Badge
                  variant="outline"
                  className={`rounded-md px-2 py-0.5 text-xs font-semibold ${hasAnomaly ? "status-warning" : "status-success"
                    }`}
                >
                  {hasAnomaly ? "Perlu Tinjauan" : "Semua Aman"}
                </Badge>
              </div>
              <div
                className={`text-2xl sm:text-3xl font-extrabold font-display tabular-nums tracking-tight ${hasAnomaly ? "text-[var(--admin-gold-text)]" : "text-foreground"
                  }`}
              >
                {statsLoading ? "..." : stats?.flaggedOffers || 0}{" "}
                <span className="text-base font-normal text-muted-foreground font-sans">
                  tawaran
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-3.5 border-t border-border">
              <AlertTriangle
                className={`w-3.5 h-3.5 shrink-0 ${hasAnomaly
                    ? "text-[var(--admin-gold-text)]"
                    : "text-[var(--admin-positive-text)]"
                  }`}
                aria-hidden="true"
              />
              <span>
                {hasAnomaly
                  ? "Terdapat tawaran anomali menunggu catatan pengawas"
                  : "Semua harga tawaran dalam toleransi wajar"}
              </span>
            </p>
          </div>
        </div>
      </Card>

      {/* Antrean Prioritas Tindakan Pengawas */}
      <Card className="admin-surface p-6 sm:p-7 gap-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="font-display font-bold text-base text-foreground">
                {hasAnomaly
                  ? "Antrean Moderasi Penawaran Petani"
                  : "Status Operasional Pasar Terkendali"}
              </h2>
              <Badge
                variant="outline"
                className={`rounded-md px-2 py-0.5 text-xs font-semibold ${hasAnomaly ? "status-warning" : "status-success"
                  }`}
              >
                {hasAnomaly ? `${stats?.flaggedOffers} Memerlukan Catatan` : "Normal"}
              </Badge>
            </div>
            <p className="text-xs sm:text-[13px] text-muted-foreground max-w-2xl leading-relaxed">
              {hasAnomaly
                ? "Terdapat tawaran dengan harga yang melampaui ambang batas toleransi pasar. Berikan catatan pengawas edukatif agar petani memahami situasi pasar tanpa membatalkan pesanan secara sepihak."
                : "Seluruh tawaran gabah yang dipublikasikan berada dalam rentang toleransi harga acuan yang valid. Parameter toleransi dan algoritma pengawasan pasar berjalan optimal."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              variant="outline"
              className="min-h-10 rounded-lg text-xs font-semibold px-4 hover:border-[#C08809] hover:bg-muted/70 active:scale-[0.985] cursor-pointer"
              render={<Link href="/admin/data-harga" />}
            >
              Observasi Data Harga
            </Button>
            <Button
              className="admin-cta min-h-10 rounded-lg text-xs font-semibold px-4 cursor-pointer group"
              render={<Link href="/admin/moderasi" />}
            >
              <span>{hasAnomaly ? "Tinjau Tawaran Anomali" : "Buka Panel Moderasi"}</span>
              <ArrowRight
                className="cta-arrow w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Button>
          </div>
        </div>
      </Card>

      {/* Log Aktivitas Terakhir (Flat Ledger Rows) */}
      <Card className="admin-surface p-0 gap-0 overflow-hidden">
        <div className="px-6 py-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-bold text-base text-foreground">
              Aktivitas Bisnis &amp; Pengawasan Terakhir
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Catatan peristiwa transaksi, mutasi status, dan tindakan sistem terkini.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="min-h-9 rounded-lg text-xs font-semibold px-3.5 hover:border-[#C08809] hover:bg-muted/70 active:scale-[0.985] cursor-pointer self-start sm:self-auto group"
            render={<Link href="/admin/log" />}
          >
            <span>Buka Semua Log</span>
            <ArrowRight
              className="w-3.5 h-3.5 ml-1.5 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Button>
        </div>

        <div className="divide-y divide-border">
          {logsLoading ? (
            <p className="text-xs text-muted-foreground py-7 px-6 text-center">
              Memuat aktivitas transaksi...
            </p>
          ) : !logs || logs.length === 0 ? (
            <div className="py-9 px-6 text-center text-xs text-muted-foreground space-y-1.5">
              <CheckCircle2 className="w-6 h-6 text-muted-foreground mx-auto opacity-60" aria-hidden="true" />
              <p className="font-semibold text-foreground">Belum ada catatan aktivitas baru</p>
              <p>Seluruh riwayat sistem akan tercatat kronologis di sini.</p>
            </div>
          ) : (
            logs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="admin-field-row px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground text-[13px]">{log.action}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-muted text-foreground text-xs font-medium uppercase">
                      {log.actorRole}
                    </span>
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

      {/* Catatan Wewenang Pengawas (Figure-Ground Direndahkan) */}
      <section
        aria-label="Prinsip dan batasan otoritas pengawas sistem"
        className="admin-editorial-note flex items-start gap-3"
      >
        <ShieldCheck
          className="w-4 h-4 text-[var(--admin-info-text)] shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <div className="space-y-1">
          <p className="text-xs font-bold text-foreground">
            Prinsip &amp; Batasan Otoritas Pengawas Sistem
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-4xl">
            Sebagai pengawas sistem SAMBUNG, wewenang Anda berfokus pada pemantauan integritas data acuan harga pasar, kalibrasi parameter sistem, dan penyisipan catatan edukatif pada tawaran anomali. Pengawas sistem tidak memiliki wewenang mengintervensi atau mengubah harga kesepakatan secara sepihak, dan data nomor kontak petani maupun pembeli tetap tersamar secara permanen demi menjaga privasi pengguna.
          </p>
        </div>
      </section>
    </PageContainer>
  );
}
