"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/shared/page-container";
import { TableRowsSkeleton } from "@/components/shared/page-skeletons";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRupiah } from "@/features/offers/components/offer-summary";
import {
  formatPaymentChannel,
  getPaymentStatusMeta,
} from "@/features/contracts/domain/payment-helpers";
import { useContracts } from "@/features/contracts/hooks/use-contracts";
import { Lock } from "lucide-react";

function getAdminPaymentBadgeClasses(
  tone: "emerald" | "blue" | "amber" | "danger" | "neutral"
): string {
  switch (tone) {
    case "emerald":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300/70 dark:border-emerald-800/60";
    case "blue":
      return "bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-300/70 dark:border-blue-800/60";
    case "amber":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300/70 dark:border-amber-800/60";
    case "danger":
      return "bg-destructive/15 text-destructive border border-destructive/40";
    default:
      return "bg-muted text-muted-foreground border border-border/60";
  }
}

export default function AdminContractsPage() {
  const { data: contracts, isLoading } = useContracts();
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredContracts = useMemo(() => {
    const list = contracts || [];

    if (statusFilter === "signed_shipping") {
      return list.filter((c) => c.status === "signed" || c.status === "shipping");
    }
    if (statusFilter === "cancelled") {
      return list.filter(
        (c) => c.status === "cancelled" || c.status === "rejected" || c.status === "expired"
      );
    }
    if (statusFilter !== "all") {
      return list.filter((c) => c.status === statusFilter);
    }

    return list;
  }, [contracts, statusFilter]);

  function maskPhone(phone?: string): string {
    if (!phone) return "0812-****-7890";
    if (phone.length >= 8) {
      return `${phone.slice(0, 4)}-****-${phone.slice(-4)}`;
    }
    return "0812-****-7890";
  }

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
          <span className="font-medium text-foreground">Pemantauan Kontrak</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Pemantauan Kesepakatan & Kontrak Digital
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-3xl">
              Pengawasan status negosiasi dua pihak, kepatuhan batas waktu, dan verifikasi
              serah terima fisik bertahap. Kontak pengguna tetap tersamar demi privasi.
            </p>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 text-xs font-semibold text-amber-800 dark:text-amber-300 border border-amber-500/20 shrink-0">
            <Lock className="w-4 h-4 shrink-0" />
            <span>Kontak Pengguna Tersamar</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors cursor-pointer shrink-0 ${
            statusFilter === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          Semua Kontrak ({contracts?.length || 0})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("pending")}
          className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors cursor-pointer shrink-0 ${
            statusFilter === "pending"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          Menunggu ({contracts?.filter((c) => c.status === "pending").length || 0})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("approved")}
          className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors cursor-pointer shrink-0 ${
            statusFilter === "approved"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          Menunggu TTD ({contracts?.filter((c) => c.status === "approved").length || 0})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("signed_shipping")}
          className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors cursor-pointer shrink-0 ${
            statusFilter === "signed_shipping"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          Escrow & Kirim (
          {contracts?.filter((c) => c.status === "signed" || c.status === "shipping").length || 0})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("completed")}
          className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors cursor-pointer shrink-0 ${
            statusFilter === "completed"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          Selesai ({contracts?.filter((c) => c.status === "completed").length || 0})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("cancelled")}
          className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors cursor-pointer shrink-0 ${
            statusFilter === "cancelled"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          Batal / Berakhir (
          {contracts?.filter(
            (c) => c.status === "cancelled" || c.status === "rejected" || c.status === "expired"
          ).length || 0}
          )
        </button>
      </div>

      {/* Table Card */}
      <Card className="rounded-2xl border border-border/80 overflow-hidden shadow-xs bg-card">
        <CardHeader className="py-4 px-6 border-b border-border/70 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold text-foreground">
            Daftar Kesepakatan Berjalan
          </CardTitle>
          <span className="text-xs text-muted-foreground tabular-nums">
            {filteredContracts.length} kesepakatan
          </span>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/80 bg-muted/40 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-5">ID Kontrak</th>
                <th className="py-3 px-5">Petani (Penjual)</th>
                <th className="py-3 px-5">Pembeli (Mitra)</th>
                <th className="py-3 px-5">Komoditas & Volume</th>
                <th className="py-3 px-5 text-right">Harga Sepakat</th>
                <th className="py-3 px-5 text-right">Total Nilai</th>
                <th className="py-3 px-5 text-center">Status</th>
                <th className="py-3 px-5">Pembayaran & Escrow</th>
                <th className="py-3 px-5 text-center">Serah Terima Fisik</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <TableRowsSkeleton columns={9} />
              ) : filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-xs text-muted-foreground">
                    Tidak ditemukan kesepakatan pada kategori ini.
                  </td>
                </tr>
              ) : (
                filteredContracts.map((contract) => {
                  const deliveryCount =
                    (contract.farmerConfirmed ? 1 : 0) + (contract.buyerConfirmed ? 1 : 0);
                  const totalAmount = (contract.currentPrice || 0) * (contract.volumeKg || 0);
                  const paymentMeta = getPaymentStatusMeta(contract);

                  return (
                    <tr key={contract.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-5 tabular-nums text-muted-foreground whitespace-nowrap text-xs">
                        <span className="font-bold text-foreground">#{contract.id}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Tawaran #{contract.offerId}
                        </p>
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <p className="font-semibold text-foreground">{contract.farmerName}</p>
                        <p className="text-xs text-muted-foreground">
                          {maskPhone(contract.farmerPhone)}
                        </p>
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <p className="font-semibold text-foreground">{contract.buyerName}</p>
                        <p className="text-xs text-muted-foreground">
                          {maskPhone(contract.buyerPhone)}
                        </p>
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground border border-border/60">
                          {contract.grainType}
                        </span>
                        <span className="ml-2 font-bold text-foreground tabular-nums">
                          {(contract.volumeKg || 0).toLocaleString("id-ID")} kg
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right font-bold text-primary whitespace-nowrap tabular-nums">
                        {formatRupiah(contract.currentPrice)}/kg
                      </td>
                      <td className="py-3.5 px-5 text-right font-bold text-foreground whitespace-nowrap tabular-nums">
                        {formatRupiah(totalAmount)}
                      </td>
                      <td className="py-3.5 px-5 text-center whitespace-nowrap">
                        <Badge
                          variant={
                            contract.status === "approved" ||
                            contract.status === "signed" ||
                            contract.status === "shipping"
                              ? "default"
                              : contract.status === "completed"
                              ? "outline"
                              : contract.status === "pending"
                              ? "secondary"
                              : "destructive"
                          }
                          className={`text-xs font-bold uppercase ${
                            contract.status === "signed"
                              ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                              : contract.status === "shipping"
                              ? "bg-blue-600 hover:bg-blue-600 text-white"
                              : ""
                          }`}
                        >
                          {contract.status === "pending"
                            ? "Menunggu"
                            : contract.status === "approved"
                            ? "Menunggu TTD"
                            : contract.status === "signed"
                            ? "Mengikat"
                            : contract.status === "shipping"
                            ? "Dikirim"
                            : contract.status === "completed"
                            ? "Selesai"
                            : contract.status === "cancelled"
                            ? "Dibatalkan"
                            : contract.status === "rejected"
                            ? "Ditolak"
                            : contract.status === "expired"
                            ? "Kedaluwarsa"
                            : contract.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${getAdminPaymentBadgeClasses(
                            paymentMeta.tone
                          )}`}
                        >
                          {paymentMeta.shortLabel}
                        </span>
                        {contract.payment && (
                          <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                            <p className="font-mono">{contract.payment.orderId}</p>
                            <p className="tabular-nums">
                              {formatRupiah(contract.payment.grossAmount)} ·{" "}
                              {formatPaymentChannel(contract.payment)}
                            </p>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-xs font-bold tabular-nums ${
                            deliveryCount === 2
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : deliveryCount === 1
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {deliveryCount}/2 Konfirmasi
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
