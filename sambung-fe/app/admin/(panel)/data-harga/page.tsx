"use client";

import { useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/shared/page-container";
import { TableRowsSkeleton } from "@/components/shared/page-skeletons";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatRupiah } from "@/features/offers/components/offer-summary";
import {
  useAdminObservations,
  usePublishObservations,
} from "@/features/admin/hooks/use-admin";
import { WeeklyIngestPanel } from "@/features/admin/components/weekly-ingest-panel";
import {
  AlertCircle,
  CheckCircle2,
  Database,
  DatabaseBackup,
  RefreshCw,
  Send,
  Info,
} from "lucide-react";

export default function AdminPriceDataPage() {
  const {
    data: records,
    isLoading,
    isError,
    error,
    refetch,
  } = useAdminObservations();
  const publishMutation = usePublishObservations();

  const [filter, setFilter] = useState<"all" | "valid" | "issue">("all");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const filteredRecords = (records || []).filter((r) => {
    if (filter === "valid") return r.status === "Valid";
    if (filter === "issue") return r.status === "Anomali" || r.status === "Ditolak";
    return true;
  });

  const handlePublish = async () => {
    await publishMutation.mutateAsync();
    setSuccessMessage("Catatan publikasi data harga acuan berhasil direkam ke log pengawas.");
    setTimeout(() => setSuccessMessage(null), 4000);
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
          <span className="font-medium text-foreground">Pemantauan Data Harga</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Pemantauan &amp; Ingest Data Harga
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-3xl">
              Ringkasan cuplikan data harga resmi BPS, Bapanas, dan PIHPS serta pengiriman pembaruan harga mingguan untuk mesin prakiraan AI.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    aria-label="Informasi sumber data observasi"
                    className="p-2 rounded-lg border border-border/70 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                }
              />
              <TooltipContent className="max-w-xs text-xs leading-relaxed">
                <p>
                  Tabel ini menampilkan cuplikan data acuan terkurasi saat ini. Menekan tombol publikasi akan mencatat konfirmasi pengawas pada jejak audit sistem dan membersihkan cache harga aktif.
                </p>
              </TooltipContent>
            </Tooltip>
            <Button
              size="sm"
              disabled={publishMutation.isPending}
              onClick={handlePublish}
              className="gap-1.5 font-bold text-xs shadow-xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Publikasikan Acuan Terkurasi</span>
            </Button>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <Tabs defaultValue="observations" className="space-y-6">
        <TabsList>
          <TabsTrigger value="observations" className="gap-1.5 text-xs font-semibold cursor-pointer">
            <Database className="w-3.5 h-3.5" />
            <span>Observasi 34 Provinsi</span>
          </TabsTrigger>
          <TabsTrigger value="ingest" className="gap-1.5 text-xs font-semibold cursor-pointer">
            <DatabaseBackup className="w-3.5 h-3.5" />
            <span>Ingest Data Mingguan AI</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="observations" className="space-y-5">
          {/* Filter Tabs */}
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                filter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Semua Data ({records?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setFilter("valid")}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                filter === "valid"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Valid ({records?.filter((r) => r.status === "Valid").length || 0})
            </button>
            <button
              type="button"
              onClick={() => setFilter("issue")}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                filter === "issue"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Perlu Tinjauan ({records?.filter((r) => r.status !== "Valid").length || 0})
            </button>
          </div>

          {/* Table Container */}
          <Card className="rounded-2xl border border-border/80 overflow-hidden shadow-xs bg-card">
            <CardHeader className="py-4 px-6 border-b border-border/70 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold text-foreground">
                Daftar Cuplikan Data Harga Wilayah
              </CardTitle>
              <span className="text-xs text-muted-foreground tabular-nums">
                {filteredRecords.length} rekaman data
              </span>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/40 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="py-3 px-5">ID &amp; Periode</th>
                    <th className="py-3 px-5">Provinsi</th>
                    <th className="py-3 px-5">Komoditas</th>
                    <th className="py-3 px-5 text-right">Harga Pengamatan</th>
                    <th className="py-3 px-5">Sumber Data</th>
                    <th className="py-3 px-5 text-center">Status Pemeriksaan</th>
                    <th className="py-3 px-5">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {isLoading ? (
                    <TableRowsSkeleton columns={7} />
                  ) : isError ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center space-y-3">
                        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-destructive">
                          <AlertCircle className="w-4 h-4" />
                          <span>
                            {error instanceof Error
                              ? error.message
                              : "Gagal memuat observasi harga dari layanan AI."}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void refetch()}
                          className="gap-1.5 text-xs cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Coba Muat Ulang
                        </Button>
                      </td>
                    </tr>
                  ) : filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-xs text-muted-foreground">
                        Tidak ditemukan data pada kategori ini.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3.5 px-5 tabular-nums text-muted-foreground whitespace-nowrap text-xs">
                          <span className="font-bold text-foreground">#{item.id}</span>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.period}</p>
                        </td>
                        <td className="py-3.5 px-5 font-semibold text-foreground whitespace-nowrap">
                          {item.province}
                        </td>
                        <td className="py-3.5 px-5 text-muted-foreground whitespace-nowrap">
                          {item.commodity}
                        </td>
                        <td className="py-3.5 px-5 text-right font-bold whitespace-nowrap tabular-nums">
                          <span
                            className={
                              item.price <= 0
                                ? "text-destructive font-black"
                                : item.price > 15000
                                  ? "text-amber-700 dark:text-amber-400 font-black"
                                  : "text-foreground"
                            }
                          >
                            {item.price > 0
                              ? formatRupiah(item.price)
                              : `${item.price} (Tidak Valid)`}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 whitespace-nowrap">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground border border-border/60">
                            {item.source}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-center whitespace-nowrap">
                          <Badge
                            variant={
                              item.status === "Valid"
                                ? "default"
                                : item.status === "Anomali"
                                  ? "secondary"
                                  : "destructive"
                            }
                            className="text-xs font-bold uppercase"
                          >
                            {item.status}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-5 text-muted-foreground text-xs leading-relaxed max-w-xs">
                          {item.reason || "Lolos pemeriksaan batas wajar dan nilai positif."}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ingest">
          <WeeklyIngestPanel />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
