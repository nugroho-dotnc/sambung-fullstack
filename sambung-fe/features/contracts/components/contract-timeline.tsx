"use client";

import { useMemo } from "react";
import {
  ShoppingBag,
  MessageSquare,
  CheckCheck,
  PenTool,
  CreditCard,
  Truck,
  CheckCircle2,
  MapPin,
  XCircle,
  Clock,
} from "lucide-react";
import { formatRupiah } from "@/features/offers/components/offer-summary";
import { CONTRACT_STATUS_LABELS } from "../domain/state-machine";
import {
  formatPaymentChannel,
  getPaymentDeadlineInfo,
  isContractPaid,
} from "../domain/payment-helpers";
import type { Contract } from "../schemas";

interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string | null;
  state: "completed" | "in_progress" | "pending" | "cancelled";
  icon: typeof ShoppingBag;
}

function formatTimelineDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ContractTimeline({
  contract,
  nowMs,
}: {
  contract: Contract;
  nowMs?: number;
}) {
  const events = useMemo(() => {
    const list: TimelineEvent[] = [];

    // 1. Pesanan Diajukan
    list.push({
      id: "order_created",
      title: "Pesanan Diajukan",
      description: `Volume ${contract.volumeKg.toLocaleString("id-ID")} kg · Penawaran awal ${formatRupiah(contract.initialPrice)}/kg${contract.history[0]?.note ? ` · Catatan: "${contract.history[0].note}"` : ""}`,
      timestamp: contract.createdAt,
      state: "completed",
      icon: ShoppingBag,
    });

    // 2. Riwayat Negosiasi Harga (jika ada tawar balik)
    if (contract.history.length > 1) {
      contract.history.slice(1).forEach((item, idx) => {
        list.push({
          id: `counter_${idx}`,
          title: `Tawar Balik: ${formatRupiah(item.price)}/kg`,
          description: `Diajukan oleh ${item.authorName}${item.note ? ` · Catatan: "${item.note}"` : ""}`,
          timestamp: item.timestamp,
          state: "completed",
          icon: MessageSquare,
        });
      });
    }

    // Jika pesanan ditolak / dibatalkan saat pending
    if (contract.status === "rejected" || (contract.status === "cancelled" && !contract.farmerSignedAt && !contract.buyerSignedAt)) {
      list.push({
        id: "terminal_cancel",
        title: contract.status === "rejected" ? "Pesanan Ditolak" : "Pesanan Dibatalkan",
        description: `Alasan: "${contract.cancelReason || "Tidak ada catatan"}"`,
        timestamp: contract.updatedAt,
        state: "cancelled",
        icon: XCircle,
      });
      return list;
    }

    // 3. Kesepakatan Harga
    const isPriceAgreed = ["approved", "signed", "shipping", "completed"].includes(contract.status);
    const lastHistoryItem = contract.history[contract.history.length - 1];
    list.push({
      id: "price_agreed",
      title: isPriceAgreed ? "Harga Disepakati" : "Menunggu Kesepakatan",
      description: isPriceAgreed
        ? `Disetujui bersama di ${formatRupiah(contract.currentPrice)}/kg · Draf surat kesepakatan terbit`
        : `Menunggu tanggapan harga dari pihak ${contract.currentTurnRole}`,
      timestamp: isPriceAgreed ? (lastHistoryItem?.timestamp ?? contract.updatedAt) : null,
      state: isPriceAgreed ? "completed" : "in_progress",
      icon: isPriceAgreed ? CheckCheck : Clock,
    });

    if (contract.status === "pending") {
      return list;
    }

    // 4. Tanda Tangan Petani
    const isFarmerSigned = Boolean(contract.farmerSignedAt);
    list.push({
      id: "farmer_signature",
      title: "Tanda Tangan Pihak Petani",
      description: isFarmerSigned
        ? `Telah ditandatangani secara digital oleh ${contract.farmerName} (${contract.farmerSignatureType === "draw" ? "Goresan tangan" : "Ketik nama"})`
        : "Menunggu tanda tangan digital dari pihak petani",
      timestamp: contract.farmerSignedAt ?? null,
      state: isFarmerSigned ? "completed" : contract.status === "approved" ? "in_progress" : "pending",
      icon: PenTool,
    });

    // 5. Tanda Tangan Produsen
    const isBuyerSigned = Boolean(contract.buyerSignedAt);
    list.push({
      id: "buyer_signature",
      title: "Tanda Tangan Pihak Produsen",
      description: isBuyerSigned
        ? `Telah ditandatangani secara digital oleh ${contract.buyerName} (${contract.buyerSignatureType === "draw" ? "Goresan tangan" : "Ketik nama"})`
        : "Menunggu tanda tangan digital dari pihak produsen",
      timestamp: contract.buyerSignedAt ?? null,
      state: isBuyerSigned ? "completed" : contract.status === "approved" ? "in_progress" : "pending",
      icon: PenTool,
    });

    const bothPartiesSigned = Boolean(contract.farmerSignedAt && contract.buyerSignedAt);

    // Jika dibatalkan saat tahap approved (sebelum kedua tanda tangan lengkap)
    if (contract.status === "cancelled" && !bothPartiesSigned) {
      list.push({
        id: "terminal_cancel_approved",
        title: "Kesepakatan Dibatalkan",
        description: `Alasan: "${contract.cancelReason || "Tidak ada catatan"}"`,
        timestamp: contract.updatedAt,
        state: "cancelled",
        icon: XCircle,
      });
      return list;
    }

    // Jika dibatalkan otomatis setelah kontrak ditandatangani kedua pihak (gagal bayar 7+3 hari)
    if (contract.status === "cancelled") {
      list.push({
        id: "escrow_payment_cancelled",
        title: "Pembayaran Escrow (Midtrans Sandbox)",
        description: "Pembayaran tidak diselesaikan dalam tenggat waktu 7 + 3 hari",
        timestamp: null,
        state: "cancelled",
        icon: CreditCard,
      });
      list.push({
        id: "terminal_cancel_unpaid",
        title: "Kontrak Dibatalkan Sistem",
        description: contract.cancelReason || "Produsen tidak membayar dalam tenggat waktu.",
        timestamp: contract.updatedAt,
        state: "cancelled",
        icon: XCircle,
      });
      return list;
    }

    // 6. Pembayaran Escrow (Midtrans Sandbox)
    const paid = isContractPaid(contract);
    const inGracePhase =
      Boolean(contract.paymentReminderSentAt) ||
      (typeof nowMs === "number" &&
        getPaymentDeadlineInfo(contract, nowMs).phase === "grace");

    list.push({
      id: "escrow_payment",
      title: "Pembayaran Escrow (Midtrans Sandbox)",
      description: paid && contract.payment
        ? `Lunas ${formatRupiah(contract.payment.grossAmount)} melalui ${formatPaymentChannel(contract.payment)} (${contract.payment.orderId})`
        : contract.status === "signed"
        ? inGracePhase
          ? "Masa tenggang 3 hari sedang berjalan. Segera selesaikan pembayaran melalui Midtrans Sandbox"
          : "Kontrak sah mengikat. Menunggu produsen melunasi pembayaran escrow dalam tenggat 7 hari"
        : "Menunggu penyelesaian pembayaran escrow setelah kedua pihak menandatangani kontrak",
      timestamp: paid ? (contract.payment?.paidAt ?? null) : null,
      state: paid
        ? "completed"
        : contract.status === "signed"
        ? "in_progress"
        : "pending",
      icon: CreditCard,
    });

    // 7. Pengiriman Gabah
    const isShipped = Boolean(contract.shippedAt) || ["shipping", "completed"].includes(contract.status);
    list.push({
      id: "grain_shipping",
      title: "Pengiriman Pasokan Gabah",
      description: isShipped
        ? "Armada pengangkut telah diberangkatkan oleh petani menuju lokasi produsen"
        : contract.status === "signed" && paid
        ? "Pembayaran escrow telah lunas. Menunggu pihak petani memberangkatkan armada"
        : contract.status === "signed" && !paid
        ? "Pengiriman gabah baru dapat dikonfirmasi setelah pembayaran escrow produsen lunas"
        : "Akan diproses setelah tanda tangan lengkap dan pembayaran escrow terverifikasi",
      timestamp: contract.shippedAt ?? null,
      state: isShipped
        ? "completed"
        : contract.status === "signed" && paid
        ? "in_progress"
        : "pending",
      icon: Truck,
    });

    // 8. Penerimaan Barang & Pencairan Escrow
    const isCompleted = contract.status === "completed" && Boolean(contract.completedAt);
    const isReleased = contract.payment?.escrowStatus === "released";
    list.push({
      id: "order_completed",
      title: "Penerimaan & Transaksi Selesai",
      description: isCompleted
        ? isReleased && contract.payment
          ? `Gabah telah diterima oleh produsen dan dana bersih ${formatRupiah(contract.payment.contractAmount)} telah dicairkan kepada petani`
          : "Gabah telah diterima dan diperiksa oleh produsen. Transaksi komitmen pasokan selesai tuntas"
        : contract.status === "shipping"
        ? "Gabah sedang dalam perjalanan. Menunggu produsen memeriksa dan mengonfirmasi penerimaan barang"
        : "Tahap akhir penerimaan fisik komoditas dan pencairan dana escrow",
      timestamp: contract.completedAt ?? null,
      state: isCompleted ? "completed" : contract.status === "shipping" ? "in_progress" : "pending",
      icon: isCompleted ? CheckCircle2 : MapPin,
    });

    return list;
  }, [contract, nowMs]);

  const currentStatusMeta = CONTRACT_STATUS_LABELS[contract.status];

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-2xs space-y-6">
      {/* Top Header pill & status badge exactly matching design reference */}
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex items-center px-3.5 py-1.5 rounded-full border border-border/80 bg-background text-xs font-bold text-foreground shadow-2xs select-none">
          Perjalanan Kontrak
        </div>

        <div className="flex-1 border-b border-dashed border-border/70 mx-2 hidden sm:block" />

        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold select-none ${
            contract.status === "completed" || contract.status === "signed"
              ? "bg-primary/15 text-primary border border-primary/30"
              : contract.status === "shipping"
              ? "bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-300 dark:border-blue-800/60"
              : contract.status === "approved" || contract.status === "pending"
              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60"
              : "bg-muted text-muted-foreground border border-border/60"
          }`}
        >
          {contract.status === "completed" || contract.status === "signed" ? (
            <CheckCircle2 className="w-3.5 h-3.5" />
          ) : contract.status === "shipping" ? (
            <Truck className="w-3.5 h-3.5" />
          ) : contract.status === "cancelled" || contract.status === "rejected" ? (
            <XCircle className="w-3.5 h-3.5" />
          ) : (
            <Clock className="w-3.5 h-3.5" />
          )}
          <span>{currentStatusMeta.label}</span>
        </div>
      </div>

      {/* Vertical Timeline List */}
      <div className="space-y-0 pt-2">
        {events.map((evt, idx) => {
          const isLast = idx === events.length - 1;
          const Icon = evt.icon;

          return (
            <div key={evt.id} className="flex items-start gap-3.5 relative group">
              {/* Left Column: Icon Circle and Connecting Line */}
              <div className="flex flex-col items-center self-stretch shrink-0">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    evt.state === "completed"
                      ? "border border-border/90 bg-slate-100 dark:bg-zinc-800 text-foreground"
                      : evt.state === "in_progress"
                      ? "border-2 border-primary bg-primary/10 text-primary ring-4 ring-primary/10"
                      : evt.state === "cancelled"
                      ? "border border-destructive/60 bg-destructive/10 text-destructive"
                      : "border border-dashed border-border/70 bg-transparent text-muted-foreground/40"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {!isLast && (
                  <div
                    className={`w-0.5 flex-1 min-h-6 my-1 ${
                      evt.state === "completed" ? "bg-border" : "bg-border/60 border-l border-dashed border-border"
                    }`}
                  />
                )}
              </div>

              {/* Center & Right Column: Content and Timestamp */}
              <div className={`flex-1 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 pb-6 ${isLast ? "pb-0" : ""}`}>
                <div className="space-y-0.5 pr-2">
                  <h4
                    className={`text-sm font-bold ${
                      evt.state === "completed"
                        ? "text-foreground"
                        : evt.state === "in_progress"
                        ? "text-primary"
                        : evt.state === "cancelled"
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }`}
                  >
                    {evt.title}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {evt.description}
                  </p>
                </div>

                {evt.timestamp ? (
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0 sm:text-right font-medium">
                    {formatTimelineDate(evt.timestamp)}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground/50 shrink-0 sm:text-right italic">
                    {evt.state === "in_progress" ? "Sedang berjalan" : "Menunggu"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
