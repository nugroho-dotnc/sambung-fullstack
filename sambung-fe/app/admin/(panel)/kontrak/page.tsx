"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/shared/page-container";
import { TableRowsSkeleton } from "@/components/shared/page-skeletons";
import { Card } from "@/components/ui/card";
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
      return "status-success";
    case "blue":
      return "status-info";
    case "amber":
      return "status-warning";
    case "danger":
      return "status-error";
    default:
      return "bg-muted text-foreground";
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

  const getContractStatusClass = (status: string): string => {
    if (status === "completed") return "status-success";
    if (status === "signed" || status === "shipping") return "status-info";
    if (status === "pending" || status === "approved") return "status-warning";
    return "status-error";
  };

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
            Pemantauan Kontrak
          </span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-[28px] font-bold tracking-tight text-foreground">
              Pemantauan Kesepakatan &amp; Kontrak Digital
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed max-w-3xl">
              Pengawasan status negosiasi dua pihak, kepatuhan batas waktu, dan verifikasi
              serah terima fisik bertahap. Kontak pengguna tetap tersamar demi privasi.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md admin-brand-pill text-xs font-semibold shrink-0 self-start sm:self-auto">
            <Lock className="w-4 h-4 shrink-0 text-white" aria-hidden="true" />
            <span>Kontak Pengguna Tersamar</span>
          </div>
        </div>
      </header>

      {/* Table Card with Integrated Filter Toolbar */}
      <Card className="admin-surface p-0 gap-0 overflow-hidden">
        <div className="px-6 py-5 border-b border-border flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-base font-bold text-foreground">
              Daftar Kesepakatan Berjalan
            </h2>
            <span aria-live="polite" className="text-xs font-semibold text-[var(--admin-gold-text)] tabular-nums">
              {filteredContracts.length} kesepakatan
            </span>
          </div>

          <div
            role="group"
            aria-label="Filter status kontrak"
            className="flex flex-wrap items-center gap-2 text-xs"
          >
            {[
              { id: "all", label: `Semua Kontrak (${contracts?.length || 0})` },
              {
                id: "pending",
                label: `Menunggu (${contracts?.filter((c) => c.status === "pending").length || 0})`,
              },
              {
                id: "approved",
                label: `Menunggu TTD (${contracts?.filter((c) => c.status === "approved").length || 0})`,
              },
              {
                id: "signed_shipping",
                label: `Escrow & Kirim (${contracts?.filter((c) => c.status === "signed" || c.status === "shipping").length || 0})`,
              },
              {
                id: "completed",
                label: `Selesai (${contracts?.filter((c) => c.status === "completed").length || 0})`,
              },
              {
                id: "cancelled",
                label: `Batal / Berakhir (${contracts?.filter((c) => c.status === "cancelled" || c.status === "rejected" || c.status === "expired").length || 0})`,
              },
            ].map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setStatusFilter(tab.id)}
                  className="admin-filter-btn min-h-9 px-3.5 rounded-lg font-semibold cursor-pointer"
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="admin-table w-full text-left border-collapse text-[13px]">
            <caption className="sr-only">
              Daftar kontrak dan kesepakatan pasokan antara petani dan pembeli dengan kontak tersamar
            </caption>
            <thead>
              <tr className="border-b border-border bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6">ID Kontrak</th>
                <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6">Petani (Penjual)</th>
                <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6">Pembeli (Mitra)</th>
                <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6">Komoditas &amp; Volume</th>
                <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6 text-right">Harga Sepakat</th>
                <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6 text-right">Total Nilai</th>
                <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6 text-center">Status</th>
                <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6">Pembayaran &amp; Escrow</th>
                <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6 text-center">Serah Terima Fisik</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <TableRowsSkeleton columns={9} />
              ) : filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-xs text-muted-foreground">
                    Tidak ditemukan kesepakatan pada kategori ini.
                  </td>
                </tr>
              ) : (
                filteredContracts.map((contract) => {
                  const deliveryCount =
                    (contract.farmerConfirmed ? 1 : 0) + (contract.buyerConfirmed ? 1 : 0);
                  const paymentMeta = getPaymentStatusMeta(contract);
                  const totalAmount = (contract.currentPrice || 0) * (contract.volumeKg || 0);

                  return (
                    <tr key={contract.id}>
                      <td className="py-4 px-5 first:pl-6 last:pr-6 tabular-nums text-muted-foreground whitespace-nowrap text-xs">
                        <span className="font-bold text-foreground">#{contract.id}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Tawaran #{contract.offerId}
                        </p>
                      </td>
                      <td className="py-4 px-5 first:pl-6 last:pr-6 whitespace-nowrap">
                        <p className="font-semibold text-foreground">{contract.farmerName}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {maskPhone(contract.farmerPhone)}
                        </p>
                      </td>
                      <td className="py-4 px-5 first:pl-6 last:pr-6 whitespace-nowrap">
                        <p className="font-semibold text-foreground">{contract.buyerName}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {maskPhone(contract.buyerPhone)}
                        </p>
                      </td>
                      <td className="py-4 px-5 first:pl-6 last:pr-6 whitespace-nowrap">
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-muted text-foreground">
                          {contract.grainType}
                        </span>
                        <span className="ml-2 font-semibold text-foreground tabular-nums">
                          {(contract.volumeKg || 0).toLocaleString("id-ID")} kg
                        </span>
                      </td>
                      <td className="py-4 px-5 first:pl-6 last:pr-6 text-right font-bold text-[var(--admin-positive-text)] whitespace-nowrap tabular-nums">
                        {formatRupiah(contract.currentPrice)}/kg
                      </td>
                      <td className="py-4 px-5 first:pl-6 last:pr-6 text-right font-bold text-foreground whitespace-nowrap tabular-nums">
                        {formatRupiah(totalAmount)}
                      </td>
                      <td className="py-4 px-5 first:pl-6 last:pr-6 text-center whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={`rounded-md px-2 py-0.5 text-xs font-semibold uppercase ${getContractStatusClass(
                            contract.status
                          )}`}
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
                      <td className="py-4 px-5 first:pl-6 last:pr-6 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${getAdminPaymentBadgeClasses(
                            paymentMeta.tone
                          )}`}
                        >
                          {paymentMeta.shortLabel}
                        </span>
                        {contract.payment && (
                          <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                            <p className="font-mono">{contract.payment.orderId}</p>
                            <p className="tabular-nums">
                              {formatRupiah(contract.payment.grossAmount)} &middot;{" "}
                              {formatPaymentChannel(contract.payment)}
                            </p>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-5 first:pl-6 last:pr-6 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-semibold tabular-nums ${
                            deliveryCount === 2
                              ? "status-success"
                              : deliveryCount === 1
                              ? "status-warning"
                              : "bg-muted text-foreground"
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
        </div>
      </Card>
    </PageContainer>
  );
}
