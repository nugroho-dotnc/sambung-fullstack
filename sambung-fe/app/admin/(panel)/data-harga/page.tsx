"use client";

import { useState } from "react";
import { PageContainer } from "@/components/shared/page-container";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { AdminTableScroll } from "@/features/admin/components/admin-table-scroll";
import { TableRowsSkeleton } from "@/components/shared/page-skeletons";
import { Card } from "@/components/ui/card";
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
      <AdminPageHeader
        section="Pemantauan Data Harga"
        title="Pemantauan & Ingest Data Harga"
        description="Ringkasan cuplikan data harga resmi BPS, Bapanas, dan PIHPS serta pengiriman pembaruan harga mingguan untuk mesin prakiraan AI."
        actions={
          <>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    aria-label="Informasi sumber data observasi"
                    className="size-9 rounded-lg bg-card text-muted-foreground hover:text-price-caution hover:bg-muted active:scale-95 inline-flex items-center justify-center cursor-pointer transition-all"
                  >
                    <Info className="w-4 h-4" aria-hidden="true" />
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
              className="min-h-11 rounded-md gap-2 font-semibold text-sm px-4 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Publikasikan Acuan Terkurasi</span>
            </Button>
          </>
        }
      />

      {successMessage && (
        <div
          role="status"
          aria-live="polite"
          className="px-4 py-3.5 rounded-lg status-success text-xs font-semibold flex items-center gap-2.5"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{successMessage}</span>
        </div>
      )}

      <Tabs defaultValue="observations" className="space-y-6">
        <TabsList className="h-auto max-w-full flex-wrap justify-start gap-1 rounded-xl bg-muted/80 p-1">
          <TabsTrigger value="observations" className="min-h-10 flex-none gap-2 rounded-lg px-3 text-sm font-semibold cursor-pointer">
            <Database className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Observasi 34 Provinsi</span>
          </TabsTrigger>
          <TabsTrigger value="ingest" className="min-h-10 flex-none gap-2 rounded-lg px-3 text-sm font-semibold cursor-pointer">
            <DatabaseBackup className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Ingest Data Mingguan AI</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="observations" className="space-y-5">
          {/* Table Container with Integrated Filter Toolbar */}
          <Card className="rounded-2xl p-0 gap-0 overflow-hidden">
            <div className="px-4 sm:px-6 py-5 border-b border-border flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h2 className="font-display text-base font-bold text-foreground">
                  Daftar Cuplikan Data Harga Wilayah
                </h2>
                <span aria-live="polite" className="text-xs font-semibold text-price-caution tabular-nums">
                  {filteredRecords.length} rekaman data
                </span>
              </div>

              <div
                role="group"
                aria-label="Filter status observasi harga"
                className="flex flex-wrap items-center gap-2 text-xs"
              >
                {[
                  { id: "all" as const, label: `Semua Data (${records?.length || 0})` },
                  {
                    id: "valid" as const,
                    label: `Valid (${records?.filter((r) => r.status === "Valid").length || 0})`,
                  },
                  {
                    id: "issue" as const,
                    label: `Perlu Tinjauan (${records?.filter((r) => r.status !== "Valid").length || 0})`,
                  },
                ].map((tab) => {
                  const active = filter === tab.id;
                  return (
                    <Button
                      key={tab.id}
                      type="button"
                      variant={active ? "default" : "outline"}
                      aria-pressed={active}
                      onClick={() => setFilter(tab.id)}
                      className="min-h-10 px-3.5 rounded-xl font-semibold cursor-pointer"
                    >
                      {tab.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <AdminTableScroll label="Cuplikan observasi harga">
              <table className="admin-table w-full text-left border-collapse text-[13px]">
                <caption className="sr-only">
                  Daftar observasi data harga pangan resmi per provinsi beserta sumber dan status pemeriksaan
                </caption>
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6">ID &amp; Periode</th>
                    <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6">Provinsi</th>
                    <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6">Komoditas</th>
                    <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6 text-right">Harga Pengamatan</th>
                    <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6">Sumber Data</th>
                    <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6 text-center">Status Pemeriksaan</th>
                    <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <TableRowsSkeleton columns={7} />
                  ) : isError ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center">
                        <div
                          role="alert"
                          className="inline-flex flex-col items-center gap-3 px-6 py-5 rounded-lg status-error mx-auto max-w-md"
                        >
                          <div className="flex items-center justify-center gap-2 text-xs font-semibold">
                            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                            <span>
                              {error instanceof Error
                                ? error.message
                                : "Gagal memuat observasi harga dari layanan AI."}
                            </span>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => void refetch()}
                            className="min-h-9 px-4 rounded-lg bg-[#F5E5E5] text-[#4A1010] hover:bg-white active:scale-95 font-semibold gap-1.5 text-xs cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Coba Muat Ulang</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-xs text-muted-foreground">
                        Tidak ditemukan data pada kategori ini.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((item) => (
                      <tr key={item.id}>
                        <td className="py-4 px-5 first:pl-6 last:pr-6 tabular-nums text-muted-foreground whitespace-nowrap text-xs">
                          <span className="font-bold text-foreground">#{item.id}</span>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.period}</p>
                        </td>
                        <td className="py-4 px-5 first:pl-6 last:pr-6 font-semibold text-foreground whitespace-nowrap">
                          {item.province}
                        </td>
                        <td className="py-4 px-5 first:pl-6 last:pr-6 text-muted-foreground whitespace-nowrap">
                          {item.commodity}
                        </td>
                        <td className="py-4 px-5 first:pl-6 last:pr-6 text-right font-bold whitespace-nowrap tabular-nums">
                          <span
                            className={
                              item.price <= 0
                                ? "text-destructive font-bold"
                                : item.price > 15000
                                  ? "text-price-caution font-bold"
                                  : "text-foreground"
                            }
                          >
                            {item.price > 0
                              ? formatRupiah(item.price)
                              : `${item.price} (Tidak Valid)`}
                          </span>
                        </td>
                        <td className="py-4 px-5 first:pl-6 last:pr-6 whitespace-nowrap">
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-muted text-foreground">
                            {item.source}
                          </span>
                        </td>
                        <td className="py-4 px-5 first:pl-6 last:pr-6 text-center whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              item.status === "Valid"
                                ? "status-success"
                                : item.status === "Anomali"
                                  ? "status-warning"
                                  : "status-error"
                            }`}
                          >
                            {item.status}
                          </Badge>
                        </td>
                        <td className="py-4 px-5 first:pl-6 last:pr-6 text-muted-foreground text-xs leading-relaxed max-w-xs">
                          {item.reason || "Lolos pemeriksaan batas wajar dan nilai positif."}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </AdminTableScroll>
          </Card>
        </TabsContent>

        <TabsContent value="ingest">
          <WeeklyIngestPanel />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
