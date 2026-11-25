"use client";

import Link from "next/link";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAdminStats, useAdminAuditLogs } from "@/features/admin/hooks/use-admin";
import {
  ShieldCheck,
  BarChart3,
  Database,
  AlertTriangle,
  ScrollText,
  Users,
  SlidersHorizontal,
  History,
  Cpu,
  ArrowRight,
  ShoppingBag,
} from "lucide-react";

export default function AdminDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: logs, isLoading: logsLoading } = useAdminAuditLogs();

  return (
    <PageContainer>
      <PageHeader
        title="Ringkasan Pengawasan & Tata Kelola"
        description="Pusat kendali operasional integritas data harga gabah, parameter pasar, dan pengawasan kesepakatan pasokan digital."
        badge={
          <Badge
            variant="outline"
            className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 text-xs font-bold"
          >
            Akses Pengawas Sistem
          </Badge>
        }
      />

      {/* Grid Metrik Pengawasan Utama */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-border/80 bg-card shadow-xs">
          <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Status Data Harga
            </span>
            <Database className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-1">
            <div className="text-2xl font-bold font-display text-foreground">
              {stats?.dataFreshnessStatus ? "Aktif & Valid" : "Memuat..."}
            </div>
            <p className="text-xs text-muted-foreground">
              Agregasi Bapanas Produsen, PIHPS & BPS
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card shadow-xs">
          <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Pasokan Terbit
            </span>
            <ShoppingBag className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-1">
            <div className="text-2xl font-bold font-display text-foreground tabular-nums">
              {statsLoading ? "..." : `${stats?.totalOffers || 0} Tawaran`}
            </div>
            <p className="text-xs text-muted-foreground tabular-nums">
              {(stats?.totalVolumeKg || 0).toLocaleString("id-ID")} kg pasokan gabah
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card shadow-xs">
          <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Kesepakatan Berjalan
            </span>
            <ScrollText className="w-4 h-4 text-amber-600" />
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-1">
            <div className="text-2xl font-bold font-display text-foreground tabular-nums">
              {statsLoading ? "..." : `${stats?.activeContracts || 0} Berjalan`}
            </div>
            <p className="text-xs text-muted-foreground tabular-nums">
              {stats?.approvedContracts || 0} kesepakatan disepakati
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card shadow-xs">
          <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Tinjauan Moderasi
            </span>
            <AlertTriangle
              className={`w-4 h-4 ${
                (stats?.flaggedOffers || 0) > 0 ? "text-amber-600" : "text-muted-foreground"
              }`}
            />
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-1">
            <div className="text-2xl font-bold font-display text-foreground tabular-nums">
              {statsLoading ? "..." : `${stats?.flaggedOffers || 0} Perlu Perbaikan`}
            </div>
            <p className="text-xs text-muted-foreground">
              {(stats?.flaggedOffers || 0) > 0
                ? "Terdapat penawaran anomali"
                : "Semua penawaran dalam batas wajar"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Menu Akses Cepat Pengawasan */}
      <div className="space-y-3">
        <h2 className="font-display font-bold text-lg text-foreground">
          Modul Pengawasan & Tata Kelola
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/admin/moderasi"
            className="group p-5 rounded-2xl border border-border/80 bg-card shadow-xs hover:border-primary/50 transition-all flex flex-col justify-between space-y-3"
          >
            <div className="space-y-1.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h3 className="font-display font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                Moderasi Tawaran Panen
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Pengawasan penawaran harga ekstrem atau anomali tanpa menyembunyikan atau membatalkan pesanan secara sepihak.
              </p>
            </div>
            <div className="flex items-center text-xs font-semibold text-primary gap-1 pt-1">
              <span>Buka Moderasi</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/admin/data-harga"
            className="group p-5 rounded-2xl border border-border/80 bg-card shadow-xs hover:border-primary/50 transition-all flex flex-col justify-between space-y-3"
          >
            <div className="space-y-1.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                <Database className="w-4 h-4" />
              </div>
              <h3 className="font-display font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                Observasi Data Harga
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Pemantauan pipeline ingest data BPS, Bapanas, dan PIHPS beserta validasi anomali sebelum publikasi ke acuan nasional.
              </p>
            </div>
            <div className="flex items-center text-xs font-semibold text-primary gap-1 pt-1">
              <span>Buka Observasi Harga</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/admin/parameter"
            className="group p-5 rounded-2xl border border-border/80 bg-card shadow-xs hover:border-primary/50 transition-all flex flex-col justify-between space-y-3"
          >
            <div className="space-y-1.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-400 flex items-center justify-center">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <h3 className="font-display font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                Parameter Sistem & HPP
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Kalibrasi ambang batas toleransi lampu harga ($\delta = 3\%$), rasio rendemen giling, dan durasi kedaluwarsa pesanan.
              </p>
            </div>
            <div className="flex items-center text-xs font-semibold text-primary gap-1 pt-1">
              <span>Kalibrasi Parameter</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/admin/pengguna"
            className="group p-5 rounded-2xl border border-border/80 bg-card shadow-xs hover:border-primary/50 transition-all flex flex-col justify-between space-y-3"
          >
            <div className="space-y-1.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="font-display font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                Manajemen Pengguna & Privasi
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Daftar profil petani dan mitra penggilingan dengan penyamaran nomor kontak wajib demi perlindungan data.
              </p>
            </div>
            <div className="flex items-center text-xs font-semibold text-primary gap-1 pt-1">
              <span>Kelola Pengguna</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/admin/log"
            className="group p-5 rounded-2xl border border-border/80 bg-card shadow-xs hover:border-primary/50 transition-all flex flex-col justify-between space-y-3"
          >
            <div className="space-y-1.5">
              <div className="w-8 h-8 rounded-xl bg-slate-500/10 text-slate-700 dark:text-slate-400 flex items-center justify-center">
                <History className="w-4 h-4" />
              </div>
              <h3 className="font-display font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                Log Audit Sistem
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Jejak audit kronologis peristiwa bisnis, mutasi status kesepakatan, dan aksi administratif yang tidak dapat dimanipulasi.
              </p>
            </div>
            <div className="flex items-center text-xs font-semibold text-primary gap-1 pt-1">
              <span>Lihat Log Audit</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/admin/model"
            className="group p-5 rounded-2xl border border-border/80 bg-card shadow-xs hover:border-primary/50 transition-all flex flex-col justify-between space-y-3"
          >
            <div className="space-y-1.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                <Cpu className="w-4 h-4" />
              </div>
              <h3 className="font-display font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                Evaluasi Model AI
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Laporan evaluasi backtesting model AI peramalan harga per unit wilayah terhadap ambang batas MASE &le; 0.90.
              </p>
            </div>
            <div className="flex items-center text-xs font-semibold text-primary gap-1 pt-1">
              <span>Evaluasi Model</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </div>

      {/* Ringkasan Log Aktivitas Terakhir */}
      <Card className="rounded-2xl border border-border/80 bg-card shadow-xs space-y-4 p-6">
        <div className="flex items-center justify-between pb-3 border-b border-border/80">
          <div>
            <h3 className="font-display font-bold text-base text-foreground">
              Aktivitas Bisnis Terakhir
            </h3>
            <p className="text-xs text-muted-foreground">
              Catatan peristiwa transaksi dan aksi sistem terbaru.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-xs font-semibold cursor-pointer"
            render={<Link href="/admin/log" />}
          >
            <span>Buka Semua Log</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>

        <div className="space-y-3">
          {logsLoading ? (
            <p className="text-xs text-muted-foreground">Memuat aktivitas...</p>
          ) : (
            (logs || []).slice(0, 3).map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-xl bg-muted/40 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{log.action}</span>
                    <Badge variant="outline" className="text-xs uppercase font-bold">
                      {log.actorRole}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-xs">{log.details}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
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

      {/* Catatan Peran Pengawas (Sesuai Aturan SRS) */}
      <Card className="rounded-2xl border-blue-500/20 bg-blue-500/5 shadow-xs">
        <CardContent className="p-5 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-bold text-foreground">
              Prinsip & Batasan Otoritas Pengawas Sistem:
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Sebagai pengawas sistem SAMBUNG, wewenang Anda berfokus pada pemantauan integritas data harga, kalibrasi parameter pasar, dan moderasi penawaran yang membutuhkan klarifikasi. Pengawas sistem tidak memiliki wewenang mengintervensi harga atas nama petani atau pembeli, serta nomor telepon pengguna tetap tersamar secara permanen.
            </p>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
