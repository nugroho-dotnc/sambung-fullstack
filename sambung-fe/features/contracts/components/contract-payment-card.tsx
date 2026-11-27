"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCheck,
  Clock,
  Copy,
  CreditCard,
  Crown,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatRupiah } from "@/features/offers/components/offer-summary";
import { buildSubscriptionUpgradeHref } from "@/features/subscription/domain/return-path";
import {
  computeContractPaymentBreakdown,
  formatFeeRatePercent,
  formatPaymentChannel,
  formatPaymentDateTime,
  getPaymentDeadlineInfo,
  getPaymentStatusMeta,
  isContractPaid,
} from "../domain/payment-helpers";
import { useInitiatePayment, useSyncPayment } from "../hooks/use-contract-payment";
import { openSnapCheckout } from "../lib/midtrans-snap";
import type { Contract } from "../schemas";

const MIDTRANS_SIMULATOR_URL = "https://simulator.sandbox.midtrans.com";

function getToneClasses(tone: "emerald" | "blue" | "amber" | "danger" | "neutral"): string {
  switch (tone) {
    case "emerald":
      return "bg-primary/15 text-primary border border-primary/30";
    case "blue":
      return "bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-300/80 dark:border-blue-800/60";
    case "amber":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800/60";
    case "danger":
      return "bg-destructive/15 text-destructive border border-destructive/40";
    default:
      return "bg-muted text-muted-foreground border border-border/70";
  }
}

function getSafeSandboxRedirectUrl(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl.trim());
    const host = parsed.hostname.toLowerCase();
    if (
      (parsed.protocol === "https:" && host === "app.sandbox.midtrans.com") ||
      ((parsed.protocol === "http:" || parsed.protocol === "https:") &&
        (host === "localhost" || host === "127.0.0.1"))
    ) {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

interface ContractPaymentCardProps {
  contract: Contract;
  userRole?: string;
  nowMs: number;
}

export function ContractPaymentCard({
  contract,
  userRole,
  nowMs,
}: ContractPaymentCardProps) {
  const shouldShow =
    ["signed", "shipping", "completed"].includes(contract.status) ||
    Boolean(contract.payment);

  const initiatePayment = useInitiatePayment(contract.id);
  const syncPayment = useSyncPayment(contract.id);
  const [localError, setLocalError] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);
  const [isOpeningCheckout, setIsOpeningCheckout] = useState(false);
  const popupHandledRef = useRef(false);

  if (!shouldShow) {
    return null;
  }

  const payment = contract.payment ?? null;
  const isPaid = isContractPaid(contract);
  const breakdown = computeContractPaymentBreakdown(contract);
  const statusMeta = getPaymentStatusMeta(contract);
  const deadline = getPaymentDeadlineInfo(contract, nowMs);
  const isBuyer = userRole === "pembeli";
  const isFarmer = userRole === "petani";
  const isBusy =
    initiatePayment.isPending || syncPayment.isPending || isOpeningCheckout;

  const isPendingExpired = Boolean(
    payment?.status === "pending" &&
      payment.expiresAt &&
      nowMs >= new Date(payment.expiresAt).getTime()
  );

  const safeRedirectUrl = getSafeSandboxRedirectUrl(payment?.redirectUrl);

  async function runSyncAfterPopup(
    trigger: "success" | "pending" | "error" | "close"
  ) {
    if (trigger === "close" && popupHandledRef.current) {
      return;
    }
    if (trigger !== "close") {
      popupHandledRef.current = true;
    }

    try {
      const synced = await syncPayment.mutateAsync();
      setLocalError(null);
      if (synced.payment.status === "paid") {
        toast.success(
          "Pembayaran terverifikasi. Dana ditahan aman di rekening bersama SAMBUNG sampai gabah Anda terima."
        );
      } else if (synced.awaitingMethodSelection) {
        if (trigger === "close") {
          toast.info(
            "Tagihan masih aktif. Silakan pilih metode pembayaran yang Anda inginkan."
          );
        } else {
          toast.info(
            "Silakan pilih metode pembayaran Anda atau cek status beberapa saat lagi."
          );
        }
      } else if (synced.payment.status === "pending") {
        toast.info(
          "Tagihan masih menunggu pembayaran diselesaikan."
        );
      } else if (
        synced.payment.status === "failed" ||
        synced.payment.status === "expired" ||
        synced.payment.status === "cancelled"
      ) {
        toast.warning(
          "Tagihan pembayaran belum selesai. Anda dapat membuat tagihan baru."
        );
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Gagal memeriksa status pembayaran ke server.";
      setLocalError(message);
    }
  }

  async function handlePay(recreate = false) {
    setLocalError(null);
    popupHandledRef.current = false;
    setIsOpeningCheckout(true);

    try {
      const session = await initiatePayment.mutateAsync({ recreate });
      const result = await openSnapCheckout({
        snapToken: session.snapToken,
        redirectUrl: session.redirectUrl,
        clientKey: session.clientKey,
        snapScriptUrl: session.snapScriptUrl,
        callbacks: {
          onSuccess: () => {
            void runSyncAfterPopup("success");
          },
          onPending: () => {
            void runSyncAfterPopup("pending");
          },
          onError: () => {
            void runSyncAfterPopup("error");
          },
          onClose: () => {
            void runSyncAfterPopup("close");
          },
        },
      });
      if (result.mode === "redirect") {
        toast.info(
          "Halaman pembayaran dibuka di tab baru. Setelah selesai membayar, tekan Cek Status Pembayaran."
        );
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Gagal menyiapkan halaman pembayaran. Silakan coba lagi.";
      setLocalError(message);
      toast.error(message);
    } finally {
      setIsOpeningCheckout(false);
    }
  }

  async function handleManualSync() {
    setLocalError(null);
    try {
      const synced = await syncPayment.mutateAsync();
      if (synced.payment.status === "paid") {
        toast.success("Pembayaran sudah lunas dan dana aman di rekening bersama.");
      } else if (synced.awaitingMethodSelection) {
        toast.info(
          "Produsen belum memilih metode pembayaran. Status tagihan masih menunggu."
        );
      } else if (synced.payment.status === "pending") {
        toast.info("Pembayaran masih berstatus menunggu penyelesaian.");
      } else {
        toast.info(
          `Status pembayaran terkini: ${getPaymentStatusMeta({
            ...contract,
            payment: synced.payment,
          }).label}.`
        );
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Gagal menyinkronkan status pembayaran.";
      setLocalError(message);
      toast.error(message);
    }
  }

  function handleCopyReference() {
    if (!payment?.paymentReference) return;
    navigator.clipboard.writeText(payment.paymentReference);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  }

  const primaryPayLabel =
    payment?.status === "pending" && !isPendingExpired
      ? "Lanjutkan Pembayaran"
      : payment && ["expired", "failed", "cancelled"].includes(payment.status)
      ? "Buat Tagihan Pembayaran Baru"
      : "Bayar Sekarang";

  return (
    <Card className="rounded-2xl border-border/80 bg-card p-6 space-y-4">
      {/* Header & Status Pill */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
          <h3 className="text-sm font-semibold text-foreground">
            Pembayaran Aman (Rekening Bersama)
          </h3>
        </div>
        <span
          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${getToneClasses(
            statusMeta.tone
          )}`}
        >
          {statusMeta.label}
        </span>
      </div>

      {/* Transparent Fee Breakdown */}
      <div className="rounded-xl bg-muted/35 border border-border/70 p-3.5 space-y-2 text-xs">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-muted-foreground">
            Nilai Gabah (100% Hak Bersih Petani)
          </span>
          <span className="font-semibold text-foreground tabular-nums">
            {formatRupiah(breakdown.contractAmount)}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-muted-foreground flex flex-wrap items-center gap-1.5">
            <span>
              Biaya Layanan Transaksi ({formatFeeRatePercent(breakdown.feeRate)} · Produsen)
            </span>
            {breakdown.isProDiscount && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300/70">
                <Crown className="w-2.5 h-2.5 shrink-0" />
                Diskon Produsen Pro · Hemat 50%
              </span>
            )}
          </span>
          <span className="font-semibold text-foreground tabular-nums">
            {formatRupiah(breakdown.buyerFeeAmount)}
          </span>
        </div>
        {isBuyer && !isPaid && !breakdown.isProDiscount && (
          <div className="text-[11px] text-amber-800 dark:text-amber-300">
            <Link
              href={buildSubscriptionUpgradeHref(`/kontrak/${contract.id}`)}
              className="inline-flex items-center gap-1 hover:underline underline-offset-2 font-medium"
            >
              <Crown className="w-3 h-3 shrink-0" />
              <span>Hemat 50% biaya layanan (jadi 0,25%) dengan Produsen Pro</span>
              <ArrowRight className="w-3 h-3 shrink-0" />
            </Link>
          </div>
        )}
        <div className="flex items-baseline justify-between gap-2 border-t border-border/60 pt-2">
          <span className="font-semibold text-foreground">
            Total yang Harus Dibayar
          </span>
          <span className="text-sm font-extrabold text-primary tabular-nums">
            {formatRupiah(breakdown.grossAmount)}
          </span>
        </div>
      </div>

      {/* Payment Deadline & Grace Banner when signed & unpaid */}
      {contract.status === "signed" && !isPaid && deadline.phase !== "none" && (
        <div
          className={`rounded-xl p-3.5 text-xs flex items-start gap-2.5 border ${
            deadline.phase === "overdue"
              ? "border-destructive/50 bg-destructive/10 text-destructive"
              : deadline.phase === "grace"
              ? "border-amber-400/80 bg-amber-50/90 dark:border-amber-800/70 dark:bg-amber-950/35 text-amber-950 dark:text-amber-200"
              : "border-border/80 bg-muted/30 text-foreground"
          }`}
        >
          {deadline.phase === "grace" || deadline.phase === "overdue" ? (
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          ) : (
            <Clock className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
          )}
          <div className="space-y-1 leading-relaxed">
            {deadline.phase === "due" && (
              <>
                <p className="font-semibold">
                  Tenggat Pembayaran 7 Hari (
                  {deadline.remainingDays > 1
                    ? `${deadline.remainingDays} hari lagi`
                    : `${deadline.remainingHours} jam lagi`}
                  )
                </p>
                <p className="text-[11px] opacity-90">
                  Jatuh tempo pada {formatPaymentDateTime(contract.paymentDueAt)}.
                  Bila belum lunas, kontrak masuk masa tenggang 3 hari.
                </p>
              </>
            )}
            {deadline.phase === "grace" && (
              <>
                <p className="font-semibold">
                  Masa Tenggang 3 Hari (
                  {deadline.remainingDays > 1
                    ? `sisa ${deadline.remainingDays} hari`
                    : `sisa ${deadline.remainingHours} jam`}
                  )
                </p>
                <p className="text-[11px] opacity-90">
                  Batas 7 hari telah lewat. Selesaikan pembayaran sebelum{" "}
                  {formatPaymentDateTime(contract.paymentGraceEndsAt)} agar
                  kontrak tidak dibatalkan otomatis oleh sistem.
                </p>
              </>
            )}
            {deadline.phase === "overdue" && (
              <>
                <p className="font-semibold">Batas Masa Tenggang Terlewati</p>
                <p className="text-[11px] opacity-90">
                  Masa tenggang berakhir pada{" "}
                  {formatPaymentDateTime(contract.paymentGraceEndsAt)}. Sistem
                  sedang memproses peninjauan dan penutupan kontrak belum lunas.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Payment Metadata Summary */}
      {payment && (
        <div className="rounded-xl border border-border/70 bg-background/70 p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Order ID</span>
            <span className="font-mono font-semibold text-foreground text-[11px]">
              {payment.orderId}
            </span>
          </div>
          {(payment.paymentChannel || payment.paymentType) && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Kanal Pembayaran</span>
              <span className="font-semibold text-foreground">
                {formatPaymentChannel(payment)}
              </span>
            </div>
          )}
          {payment.paymentReference && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Kode / Nomor VA</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-foreground">
                  {payment.paymentReference}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[11px]"
                  onClick={handleCopyReference}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  {copiedRef ? "Tersalin" : "Salin"}
                </Button>
              </div>
            </div>
          )}
          {payment.paidAt && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Terbayar Pada</span>
              <span className="font-medium text-foreground tabular-nums">
                {formatPaymentDateTime(payment.paidAt)}
              </span>
            </div>
          )}
          {payment.releasedAt && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Dana Dicairkan</span>
              <span className="font-semibold text-primary tabular-nums">
                {formatPaymentDateTime(payment.releasedAt)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Paid Escrow Status Explanation */}
      {isPaid && payment?.escrowStatus === "held" && (
        <div className="rounded-xl border border-primary/30 bg-primary/10 p-3.5 text-xs text-foreground flex items-start gap-2.5">
          <CheckCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Pembayaran sudah diterima. Dana bersih sebesar{" "}
            <strong>{formatRupiah(breakdown.contractAmount)}</strong> ditahan
            aman di rekening bersama dan akan langsung diteruskan ke petani
            setelah produsen mengonfirmasi gabah diterima.
          </p>
        </div>
      )}

      {isPaid && payment?.escrowStatus === "released" && (
        <div className="rounded-xl border border-primary/30 bg-primary/10 p-3.5 text-xs text-foreground flex items-start gap-2.5">
          <CheckCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Dana bersih sebesar{" "}
            <strong>{formatRupiah(breakdown.contractAmount)}</strong> sudah
            diteruskan ke petani pada{" "}
            <strong>{formatPaymentDateTime(payment.releasedAt)}</strong>.
          </p>
        </div>
      )}

      {/* Inline Error Alert */}
      {localError && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{localError}</span>
        </div>
      )}

      {/* Buyer Interactive Payment Controls */}
      {isBuyer && contract.status === "signed" && !isPaid && (
        <div className="space-y-2.5 pt-1">
          <Button
            type="button"
            className="w-full min-h-11 text-xs font-semibold"
            disabled={isBusy || deadline.phase === "overdue"}
            onClick={() => void handlePay(false)}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            {initiatePayment.isPending || isOpeningCheckout
              ? "Menyiapkan Pembayaran…"
              : primaryPayLabel}
          </Button>

          {payment && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-9 text-xs"
                disabled={isBusy}
                onClick={() => void handleManualSync()}
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 mr-1.5 ${
                    syncPayment.isPending ? "animate-spin" : ""
                  }`}
                />
                {syncPayment.isPending
                  ? "Memeriksa…"
                  : "Cek Status Pembayaran"}
              </Button>

              {payment.status === "pending" && (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-9 text-xs"
                  disabled={isBusy || deadline.phase === "overdue"}
                  onClick={() => void handlePay(true)}
                >
                  Ganti Metode Pembayaran
                </Button>
              )}
            </div>
          )}

          {payment?.status === "pending" && (safeRedirectUrl || MIDTRANS_SIMULATOR_URL) && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground">
              {safeRedirectUrl && (
                <a
                  href={safeRedirectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-foreground underline underline-offset-2"
                >
                  Buka Halaman Midtrans
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <a
                href={MIDTRANS_SIMULATOR_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-foreground underline underline-offset-2"
              >
                Simulator Pembayaran Sandbox
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* Farmer Read-Only Escrow Monitoring & Manual Sync */}
      {isFarmer && contract.status === "signed" && !isPaid && (
        <div className="space-y-3 pt-1">
          <div className="rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 p-3 text-xs text-amber-950 dark:text-amber-200 leading-relaxed">
            Produsen perlu melunasi tagihan terlebih dahulu agar tombol{" "}
            <strong>Konfirmasi Pengiriman Gabah</strong> aktif dan hak bersih{" "}
            <strong>{formatRupiah(breakdown.contractAmount)}</strong> aman di
            rekening bersama.
          </div>

          {payment && (
            <Button
              type="button"
              variant="outline"
              className="w-full min-h-9 text-xs"
              disabled={isBusy}
              onClick={() => void handleManualSync()}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 mr-1.5 ${
                  syncPayment.isPending ? "animate-spin" : ""
                }`}
              />
              {syncPayment.isPending
                ? "Memeriksa Status…"
                : "Cek Status Pembayaran"}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
