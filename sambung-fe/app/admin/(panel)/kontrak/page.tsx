"use client";

import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { PageContainer } from "@/components/shared/page-container";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { AdminTableScroll } from "@/features/admin/components/admin-table-scroll";
import { TableRowsSkeleton } from "@/components/shared/page-skeletons";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRupiah } from "@/features/offers/components/offer-summary";
import {
  formatPaymentChannel,
  getPaymentStatusMeta,
} from "@/features/contracts/domain/payment-helpers";
import { contractBadgeStyles } from "@/features/contracts/components/contract-status-badge-styles";
import { CONTRACT_STATUS_LABELS } from "@/features/contracts/domain/state-machine";
import { useContracts } from "@/features/contracts/hooks/use-contracts";

export default function AdminContractsPage() {
  const { data: contracts, isLoading, isError, error, refetch } = useContracts();
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
    if (!phone) return "Tertutup";
    if (phone.includes("*")) return phone;
    if (phone.length >= 8) {
      return `${phone.slice(0, 4)}-****-${phone.slice(-4)}`;
    }
    return "Tersamar";
  }

  return (
    <PageContainer>
      <AdminPageHeader
        section="Pemantauan Kontrak"
        title="Pemantauan Kesepakatan & Kontrak Digital"
        description="Pengawasan status negosiasi dua pihak, kepatuhan batas waktu, dan verifikasi serah terima fisik bertahap. Kontak pengguna tetap tersamar demi privasi."
      />

      {/* Table Card with Integrated Filter Toolbar */}
      <Card className="rounded-2xl p-0 gap-0 overflow-hidden">
        <div className="px-4 sm:px-6 py-5 border-b border-border flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-base font-bold text-foreground">
              Daftar Kesepakatan Berjalan
            </h2>
            <span aria-live="polite" className="text-xs font-semibold text-price-caution tabular-nums">
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
                <Button
                  key={tab.id}
                  type="button"
                  variant={active ? "default" : "outline"}
                  aria-pressed={active}
                  onClick={() => setStatusFilter(tab.id)}
                  className="min-h-10 px-3.5 rounded-xl font-semibold cursor-pointer"
                >
                  {tab.label}
                </Button>
              );
            })}
          </div>
        </div>

        <AdminTableScroll label="Daftar kesepakatan">
          <table className="admin-table w-full text-left border-collapse text-[13px]">
            <caption className="sr-only">
              Daftar kontrak dan kesepakatan pasokan antara petani dan produsen dengan kontak tersamar
            </caption>
            <thead>
              <tr className="border-b border-border bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6">ID Kontrak</th>
                <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6">Petani (Penjual)</th>
                <th scope="col" className="py-3.5 px-5 first:pl-6 last:pr-6">Produsen (Mitra)</th>
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
              ) : isError ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-xs space-y-2">
                    <p className="font-semibold text-destructive">
                      {error?.message || "Gagal memuat daftar kesepakatan."}
                    </p>
                    <button
                      type="button"
                      onClick={() => void refetch()}
                      className="px-3 py-1.5 rounded-md border border-border text-xs font-semibold hover:bg-muted cursor-pointer"
                    >
                      Coba Muat Ulang
                    </button>
                  </td>
                </tr>
              ) : filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-xs text-muted-foreground">
                    Tidak ditemukan kesepakatan pada kategori ini.
                  </td>
                </tr>
              ) : (
                filteredContracts.map((contract) => {
                  const handoverMeta =
                    contract.status === "completed" || Boolean(contract.completedAt)
                      ? { label: "2/2 Diterima", cls: "status-success" }
                      : contract.status === "shipping" || Boolean(contract.shippedAt)
                      ? { label: "1/2 Dikirim", cls: "status-warning" }
                      : { label: "0/2 Belum Kirim", cls: "bg-muted text-foreground" };
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
                      <td className="py-4 px-5 first:pl-6 last:pr-6 text-right font-bold text-primary whitespace-nowrap tabular-nums">
                        {formatRupiah(contract.currentPrice)}/kg
                      </td>
                      <td className="py-4 px-5 first:pl-6 last:pr-6 text-right font-bold text-foreground whitespace-nowrap tabular-nums">
                        {formatRupiah(totalAmount)}
                      </td>
                      <td className="py-4 px-5 first:pl-6 last:pr-6 text-center whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${contractBadgeStyles[CONTRACT_STATUS_LABELS[contract.status].tone]}`}
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
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${contractBadgeStyles[paymentMeta.tone]}`}
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
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold tabular-nums ${handoverMeta.cls}`}
                        >
                          {handoverMeta.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </AdminTableScroll>
      </Card>
    </PageContainer>
  );
}
