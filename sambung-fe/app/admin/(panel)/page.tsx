"use client";

import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { ActivityRowsSkeleton } from "@/components/shared/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { useAdminStats, useAdminAuditLogs } from "@/features/admin/hooks/use-admin";
import { useAiHealth } from "@/features/ai/hooks/use-ai-health";
import {
  ShieldCheck,
  Database,
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

  const flaggedOffers = stats?.flaggedOffers ?? 0;
  const hasAnomaly = flaggedOffers > 0;
  const aiStatus = aiHealthLoading ? "loading" : aiHealth?.ready ? "ready" : aiHealth?.status;
  const aiStatusLabel = aiStatus === "loading"
    ? "Memeriksa…"
    : aiStatus === "ready"
      ? "Siap"
      : aiStatus === "starting" ? "Memuat model…" : "Tidak tersedia";
  const aiStatusClass = aiStatus === "loading"
    ? "bg-muted text-muted-foreground"
    : aiStatus === "ready"
      ? "bg-primary/10 text-primary"
      : aiStatus === "starting" ? "bg-price-caution-surface text-price-caution" : "bg-destructive/10 text-destructive";

  return (
    <PageContainer>
      <PageHeader
        title="Ringkasan Pengawasan & Tata Kelola"
        description="Pantau acuan harga gabah, pasokan terdaftar, dan tawaran yang perlu ditinjau."
      />

      <section aria-label="Metrik pengawasan" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="min-w-0 rounded-2xl gap-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-sans text-xs font-semibold text-muted-foreground">Integritas Data Harga</h2>
            {statsLoading ? (
              <Skeleton className="h-5 w-20 rounded-full" />
            ) : (
              <Badge variant="outline" className={stats?.dataFreshnessStatus
                ? "rounded-full border-primary/30 bg-primary/10 text-primary"
                : "rounded-full border-transparent bg-price-caution-surface text-price-caution"}>
                {stats?.dataFreshnessStatus ? "Aktif & Valid" : "Perlu Cek"}
              </Badge>
            )}
          </div>
          <div className="space-y-1.5">
            <p className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Bapanas &amp; BPS</p>
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Database className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              Sinkronisasi data acuan pasar berkala
            </p>
          </div>
          <div className="mt-auto flex items-start justify-between gap-2 border-t border-border/60 pt-3">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-medium text-muted-foreground">Layanan AI</span>
                <Badge variant="outline" className={`rounded-full border-transparent ${aiStatusClass}`}>
                  {aiStatusLabel}
                </Badge>
              </div>
              {aiStatus === "ready" && aiHealth?.modelVersion && (
                <p className="break-all text-xs text-muted-foreground">{aiHealth.modelVersion}</p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => void refetchAiHealth()}
              disabled={aiHealthFetching}
              aria-label="Segarkan status layanan AI"
              className="size-9 cursor-pointer text-muted-foreground"
            >
              <RefreshCw className={aiHealthFetching ? "animate-spin" : undefined} aria-hidden="true" />
            </Button>
          </div>
        </Card>

        <Card className="min-w-0 rounded-2xl gap-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-sans text-xs font-semibold text-muted-foreground">Pasokan Gabah Terdaftar</h2>
            {statsLoading ? (
              <Skeleton className="h-5 w-16 rounded-full" />
            ) : (
              <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/10 tabular-nums text-primary">
                {stats?.totalOffers ?? 0} tawaran
              </Badge>
            )}
          </div>
          {statsLoading ? (
            <Skeleton className="h-8 w-28 rounded-md" />
          ) : (
            <p className="font-display text-2xl font-extrabold tracking-tight tabular-nums sm:text-3xl">
              {(stats?.totalVolumeKg ?? 0).toLocaleString("id-ID")}{" "}
              <span className="font-sans text-base font-normal text-muted-foreground">kg</span>
            </p>
          )}
          <p className="mt-auto flex items-start gap-1.5 border-t border-border/60 pt-3 text-xs tabular-nums text-muted-foreground">
            <ScrollText className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {stats?.activeContracts ?? 0} kesepakatan pasokan aktif
          </p>
        </Card>

        <Card className="min-w-0 rounded-2xl gap-4 p-5 md:col-span-2 xl:col-span-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-sans text-xs font-semibold text-muted-foreground">Perlu Tindakan Pengawas</h2>
            {statsLoading ? (
              <Skeleton className="h-5 w-20 rounded-full" />
            ) : (
              <Badge variant="outline" className={hasAnomaly
                ? "rounded-full border-transparent bg-price-caution-surface text-price-caution"
                : "rounded-full border-primary/30 bg-primary/10 text-primary"}>
                {hasAnomaly ? "Perlu Tinjauan" : "Semua Aman"}
              </Badge>
            )}
          </div>
          {statsLoading ? (
            <Skeleton className="h-8 w-20 rounded-md" />
          ) : (
            <p className={`font-display text-2xl font-extrabold tracking-tight tabular-nums sm:text-3xl ${hasAnomaly ? "text-price-caution" : "text-foreground"}`}>
              {flaggedOffers}{" "}
              <span className="font-sans text-base font-normal text-muted-foreground">tawaran</span>
            </p>
          )}
          <p className="mt-auto border-t border-border/60 pt-3 text-xs text-muted-foreground">
            {hasAnomaly ? "Tawaran anomali menunggu catatan pengawas" : "Semua harga tawaran dalam toleransi wajar"}
          </p>
        </Card>
      </section>

      <Card className={`rounded-2xl gap-0 p-5 sm:p-6 ${hasAnomaly ? "bg-price-caution-surface" : "bg-primary/5"}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="font-display font-bold text-base text-foreground">
                {hasAnomaly
                  ? "Antrean Moderasi Penawaran Petani"
                  : "Status Operasional Pasar Terkendali"}
              </h2>
              <Badge
                variant="outline"
                className={`rounded-full border-transparent font-semibold ${hasAnomaly ? "bg-price-caution-surface text-price-caution" : "bg-primary/10 text-primary"
                  }`}
              >
                {hasAnomaly ? `${flaggedOffers} Memerlukan Catatan` : "Normal"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
              {hasAnomaly
                ? "Terdapat tawaran dengan harga yang melampaui ambang batas toleransi pasar. Berikan catatan pengawas edukatif agar petani memahami situasi pasar tanpa membatalkan pesanan secara sepihak."
                : "Seluruh tawaran gabah yang dipublikasikan berada dalam rentang toleransi harga acuan yang valid. Parameter toleransi dan algoritma pengawasan pasar berjalan optimal."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <ButtonLink
              variant="outline"
              className="min-h-11 font-semibold cursor-pointer"
              href="/admin/data-harga"
            >
              Observasi Data Harga
            </ButtonLink>
            <ButtonLink
              className="min-h-11 font-semibold cursor-pointer group"
              href="/admin/moderasi"
            >
              <span>{hasAnomaly ? "Tinjau Tawaran Anomali" : "Buka Panel Moderasi"}</span>
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </ButtonLink>
          </div>
        </div>
      </Card>

      <Card className="rounded-2xl p-0 gap-0">
        <div className="px-6 py-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-bold text-base text-foreground">
              Aktivitas Bisnis &amp; Pengawasan Terakhir
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Catatan peristiwa transaksi, mutasi status, dan tindakan sistem terkini.
            </p>
          </div>
          <ButtonLink
            variant="outline"
            size="sm"
            className="min-h-10 font-semibold cursor-pointer self-start sm:self-auto group"
            href="/admin/log"
          >
            <span>Buka Semua Log</span>
            <ArrowRight
              className="w-3.5 h-3.5 ml-1.5 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </ButtonLink>
        </div>

        <div className="divide-y divide-border">
          {logsLoading ? (
            <ActivityRowsSkeleton label="Memuat aktivitas transaksi..." />
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
                    <span className="break-all text-sm font-semibold text-foreground">{log.action}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-foreground text-xs font-medium uppercase">
                      {log.actorRole}
                    </span>
                  </div>
                  <p className="break-words text-muted-foreground text-xs leading-relaxed">{log.details}</p>
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

      <section
        aria-label="Prinsip dan batasan otoritas pengawas sistem"
        className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/40 p-4"
      >
        <ShieldCheck
          className="w-4 h-4 text-primary shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <div className="space-y-1">
          <p className="text-xs font-bold text-foreground">
            Prinsip &amp; Batasan Otoritas Pengawas Sistem
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-4xl">
            Sebagai pengawas sistem SAMBUNG, wewenang Anda berfokus pada pemantauan integritas data acuan harga pasar, kalibrasi parameter sistem, dan penyisipan catatan edukatif pada tawaran anomali. Pengawas sistem tidak memiliki wewenang mengintervensi atau mengubah harga kesepakatan secara sepihak, dan data nomor kontak petani maupun produsen tetap tersamar secara permanen demi menjaga privasi pengguna.
          </p>
        </div>
      </section>
    </PageContainer>
  );
}
