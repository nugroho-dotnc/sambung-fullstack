"use client";

import { useRef, useState } from "react";
import {
  AlertCircle,
  Award,
  BarChart3,
  CheckCircle2,
  Copy,
  CreditCard,
  Crown,
  ExternalLink,
  Percent,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { AsyncBoundary } from "@/components/shared/async-boundary";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCurrentUser } from "@/features/auth/hooks/use-auth";
import {
  formatPaymentChannel,
  formatPaymentDateTime,
} from "@/features/contracts/domain/payment-helpers";
import { openSnapCheckout } from "@/features/contracts/lib/midtrans-snap";
import { formatRupiah } from "@/features/offers/components/offer-summary";
import { ProBadge } from "@/features/subscription/components/pro-badge";
import {
  useCheckoutSubscription,
  useMySubscription,
  useSyncSubscription,
} from "@/features/subscription/hooks/use-subscription";

const MIDTRANS_SIMULATOR_URL = "https://simulator.sandbox.midtrans.com";

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

function getSubscriptionPaymentStatusLabel(status: string): {
  label: string;
  classes: string;
} {
  switch (status) {
    case "paid":
      return {
        label: "Lunas",
        classes:
          "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300/70 dark:border-emerald-800/60",
      };
    case "pending":
      return {
        label: "Menunggu Bayar",
        classes:
          "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300/70 dark:border-amber-800/60",
      };
    case "expired":
      return {
        label: "Kedaluwarsa",
        classes: "bg-destructive/15 text-destructive border border-destructive/40",
      };
    case "failed":
      return {
        label: "Gagal",
        classes: "bg-destructive/15 text-destructive border border-destructive/40",
      };
    case "cancelled":
      return {
        label: "Dibatalkan",
        classes: "bg-muted text-muted-foreground border border-border/70",
      };
    case "refunded":
      return {
        label: "Dikembalikan",
        classes: "bg-muted text-muted-foreground border border-border/70",
      };
    default:
      return {
        label: status,
        classes: "bg-muted text-muted-foreground border border-border/70",
      };
  }
}

const PLAN_COMPARISON_ROWS = [
  {
    icon: BarChart3,
    title: "Riwayat Harga & Ekspor CSV",
    freeValue: "4, 8, dan 12 pekan terakhir (ekspor CSV terkunci)",
    proValue: "Lengkap 2019–Sekarang (35 wilayah) + Ekspor CSV (Harga, Peta & Katalog)",
  },
  {
    icon: TrendingUp,
    title: "Prakiraan Tren Harga AI (/prakiraan)",
    freeValue: "1 provinsi domisili akun (ringkasan harga)",
    proValue: "Seluruh provinsi + Faktor Penggerak AI lengkap",
  },
  {
    icon: Percent,
    title: "Biaya Layanan Escrow Kontrak",
    freeValue: "0,5% dari nilai gabah (ditanggung pembeli)",
    proValue: "0,25% dari nilai gabah — Hemat 50%",
  },
  {
    icon: Award,
    title: "Lencana Identitas & Negosiasi",
    freeValue: "Lencana pembeli standar",
    proValue: "Lencana Pembeli Pro di profil dan kontrak",
  },
] as const;

export default function SubscriptionPage() {
  const { data: user, isLoading: isUserLoading } = useCurrentUser();
  const isBuyer = user?.role === "pembeli";

  const subQuery = useMySubscription({ enabled: isBuyer });
  const checkoutMutation = useCheckoutSubscription();
  const syncMutation = useSyncSubscription();

  const [localError, setLocalError] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);
  const [isOpeningCheckout, setIsOpeningCheckout] = useState(false);
  const popupHandledRef = useRef(false);

  const sub = subQuery.data;
  const latestPayment = sub?.latestPayment ?? null;
  const isBusy =
    checkoutMutation.isPending || syncMutation.isPending || isOpeningCheckout;
  const safeRedirectUrl = getSafeSandboxRedirectUrl(latestPayment?.redirectUrl);

  async function runSyncAfterPopup(
    trigger: "success" | "pending" | "error" | "close",
    orderId?: string
  ) {
    if (trigger === "close" && popupHandledRef.current) {
      return;
    }
    if (trigger !== "close") {
      popupHandledRef.current = true;
    }

    try {
      const res = await syncMutation.mutateAsync(orderId ? { orderId } : undefined);
      setLocalError(null);
      if (res.payment.status === "paid") {
        toast.success(
          "Langganan Pembeli Pro aktif. Seluruh fitur analitik penuh dan diskon fee 0,25% sudah terbuka."
        );
      } else if (res.awaitingMethodSelection) {
        toast.info(
          "Sesi pembayaran masih aktif dan menunggu Anda memilih metode pembayaran."
        );
      } else if (res.payment.status === "pending") {
        toast.info(
          "Tagihan langganan masih menunggu penyelesaian pembayaran di Midtrans Sandbox."
        );
      } else if (["failed", "expired", "cancelled"].includes(res.payment.status)) {
        toast.warning(
          "Sesi pembayaran sebelumnya belum selesai. Anda dapat membuat sesi baru."
        );
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Gagal memeriksa status pembayaran langganan.";
      setLocalError(msg);
    }
  }

  async function handleCheckout(recreate = false) {
    setLocalError(null);
    popupHandledRef.current = false;
    setIsOpeningCheckout(true);

    try {
      const session = await checkoutMutation.mutateAsync({ recreate });
      const result = await openSnapCheckout({
        snapToken: session.snapToken,
        redirectUrl: session.redirectUrl,
        clientKey: session.clientKey,
        snapScriptUrl: session.snapScriptUrl,
        callbacks: {
          onSuccess: () => {
            void runSyncAfterPopup("success", session.payment.orderId);
          },
          onPending: () => {
            void runSyncAfterPopup("pending", session.payment.orderId);
          },
          onError: () => {
            void runSyncAfterPopup("error", session.payment.orderId);
          },
          onClose: () => {
            void runSyncAfterPopup("close", session.payment.orderId);
          },
        },
      });
      if (result.mode === "redirect") {
        toast.info(
          "Halaman Midtrans Sandbox dibuka pada tab baru. Tekan Cek Status Pembayaran setelah selesai membayar."
        );
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Gagal membuka pembayaran langganan Midtrans Sandbox.";
      setLocalError(msg);
      toast.error(msg);
    } finally {
      setIsOpeningCheckout(false);
    }
  }

  async function handleManualSync() {
    setLocalError(null);
    try {
      const res = await syncMutation.mutateAsync(
        latestPayment?.orderId ? { orderId: latestPayment.orderId } : undefined
      );
      if (res.payment.status === "paid") {
        toast.success("Pembayaran langganan terkonfirmasi lunas dan Pembeli Pro aktif.");
      } else if (res.awaitingMethodSelection) {
        toast.info(
          "Metode pembayaran belum dipilih pada jendela Snap. Status tagihan masih menunggu."
        );
      } else {
        toast.info(
          `Status tagihan terkini: ${getSubscriptionPaymentStatusLabel(res.payment.status).label}.`
        );
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Gagal menyinkronkan status pembayaran langganan.";
      setLocalError(msg);
      toast.error(msg);
    }
  }

  function handleCopyReference() {
    if (!latestPayment?.paymentReference) return;
    navigator.clipboard.writeText(latestPayment.paymentReference);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  }

  if (!isUserLoading && user && !isBuyer) {
    const isFarmer = user.role === "petani";
    return (
      <PageContainer>
        <PageHeader
          title="Paket Langganan SAMBUNG"
          description="Informasi keanggotaan dan keterbukaan fitur analitik pada platform SAMBUNG."
        />
        <Card className="rounded-2xl border-border/80 bg-card p-6 sm:p-8 max-w-2xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                {isFarmer
                  ? "Akun Petani Gratis 100% Selamanya"
                  : "Akun Pengawas Sistem Tidak Memerlukan Langganan"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isFarmer
                  ? "Seluruh fitur petani tidak dikenai biaya langganan maupun potongan escrow."
                  : "Seluruh modul pengawasan, analitik harga, dan evaluasi model terbuka bagi pengawas."}
              </p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {isFarmer
              ? "Anda tetap menikmati akses gratis untuk jual beli gabah, Cek Harga Wajar AI, pemantauan harga pasar, serta hak bersih 100% pada setiap transaksi escrow. Fitur ekspor CSV dan paket Pembeli Pro khusus tersedia untuk akun Pembeli / Penggilingan."
              : "Paket langganan Pembeli Pro hanya berlaku khusus untuk akun Pembeli / Penggilingan."}
          </p>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Paket Langganan Pembeli Pro"
        description="Buka riwayat harga lengkap 2019–sekarang + ekspor CSV, prakiraan AI lintas provinsi beserta faktor pendorong, dan diskon biaya layanan escrow 50% (0,25%)."
      />

      <AsyncBoundary
        isLoading={isUserLoading || subQuery.isLoading}
        isError={subQuery.isError}
        error={subQuery.error}
        isEmpty={!subQuery.isLoading && !subQuery.isError && !sub}
        onRetry={() => void subQuery.refetch()}
      >
        {sub && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Current Status & Midtrans Snap Checkout */}
              <Card className="lg:col-span-5 rounded-2xl border-border/80 bg-card p-6 sm:p-7 space-y-5">
                <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-4">
                  <div>
                    <span className="text-xs font-semibold text-primary">
                      Status Keanggotaan
                    </span>
                    <h2 className="type-subheading font-bold text-foreground mt-0.5">
                      {sub.isPro ? "Pembeli Pro Aktif" : "Paket Pembeli Gratis"}
                    </h2>
                  </div>
                  {sub.isPro ? (
                    <ProBadge size="sm" />
                  ) : (
                    <Badge variant="outline" className="text-xs font-semibold">
                      {sub.status === "expired" ? "Masa Aktif Berakhir" : "Paket Gratis"}
                    </Badge>
                  )}
                </div>

                {/* Price & Period Info */}
                <div className="rounded-xl bg-muted/35 border border-border/70 p-4 space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Tarif Tetap Pembeli Pro
                    </span>
                    <span className="text-2xl font-extrabold font-display tabular-nums text-foreground">
                      {formatRupiah(sub.priceIdr)}
                      <span className="text-xs font-normal text-muted-foreground font-sans ml-1">
                        / {sub.durationDays} hari
                      </span>
                    </span>
                  </div>

                  {sub.isPro && sub.proExpiresAt ? (
                    <div className="pt-2 border-t border-border/50 text-xs space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">Berlaku Hingga</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                          {formatPaymentDateTime(sub.proExpiresAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">Sisa Masa Aktif</span>
                        <span className="font-semibold text-foreground tabular-nums">
                          {sub.remainingDays} hari lagi
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground pt-1 leading-relaxed">
                        Perpanjangan sebelum habis akan menyambung +30 hari langsung dari tanggal berakhir saat ini tanpa menghanguskan sisa hari.
                      </p>
                    </div>
                  ) : (
                    <p className="pt-2 border-t border-border/50 text-[11px] text-muted-foreground leading-relaxed">
                      Pembayaran manual per 30 hari melalui Midtrans Sandbox (tanpa perpanjangan otomatis diam-diam). Petani tetap menerima 100% bersih tanpa potongan.
                    </p>
                  )}
                </div>

                {localError && (
                  <div
                    role="alert"
                    className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{localError}</span>
                  </div>
                )}

                {/* Pending Snap Checkout Session Details */}
                {latestPayment && latestPayment.status === "pending" && (
                  <div className="rounded-xl border border-amber-300/80 bg-amber-50/75 dark:border-amber-800/70 dark:bg-amber-950/30 p-4 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-amber-900 dark:text-amber-200">
                        Tagihan Menunggu Pembayaran
                      </span>
                      <span className="font-mono text-[11px] text-foreground">
                        {latestPayment.orderId}
                      </span>
                    </div>
                    {(latestPayment.paymentChannel || latestPayment.paymentType) && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">Kanal Pembayaran</span>
                        <span className="font-semibold text-foreground">
                          {formatPaymentChannel(latestPayment)}
                        </span>
                      </div>
                    )}
                    {latestPayment.paymentReference && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">Kode / Nomor VA</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-foreground">
                            {latestPayment.paymentReference}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[11px] cursor-pointer"
                            onClick={handleCopyReference}
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            {copiedRef ? "Tersalin" : "Salin"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Primary Checkout & Sync Buttons */}
                <div className="space-y-2.5">
                  <Button
                    type="button"
                    disabled={isBusy}
                    onClick={() => void handleCheckout(false)}
                    className="w-full min-h-11 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {checkoutMutation.isPending || isOpeningCheckout
                      ? "Menyiapkan Sesi Pembayaran…"
                      : latestPayment?.status === "pending"
                      ? "Lanjutkan Pembayaran"
                      : sub.isPro
                      ? `Perpanjang +30 Hari (${formatRupiah(sub.priceIdr)})`
                      : `Aktifkan Pembeli Pro (${formatRupiah(sub.priceIdr)})`}
                  </Button>

                  {latestPayment && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-9 text-xs cursor-pointer"
                        disabled={isBusy}
                        onClick={() => void handleManualSync()}
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 mr-1.5 ${
                            syncMutation.isPending ? "animate-spin" : ""
                          }`}
                        />
                        {syncMutation.isPending
                          ? "Memeriksa…"
                          : "Cek Status Pembayaran"}
                      </Button>

                      {latestPayment.status === "pending" && (
                        <Button
                          type="button"
                          variant="outline"
                          className="min-h-9 text-xs cursor-pointer"
                          disabled={isBusy}
                          onClick={() => void handleCheckout(true)}
                        >
                          Ganti Metode Pembayaran
                        </Button>
                      )}
                    </div>
                  )}

                  {latestPayment?.status === "pending" && (
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
              </Card>

              {/* Right Column: Plan Benefits Comparison */}
              <Card className="lg:col-span-7 rounded-2xl border-border/80 bg-card p-6 sm:p-7 space-y-5">
                <div className="border-b border-border/60 pb-4 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-primary">
                      Rincian Manfaat Paket
                    </span>
                    <h2 className="type-subheading font-bold text-foreground mt-0.5">
                      Perbandingan Paket Gratis vs Pembeli Pro
                    </h2>
                  </div>
                  <Crown className="w-5 h-5 text-amber-500 shrink-0" />
                </div>

                <div className="divide-y divide-border/60">
                  {PLAN_COMPARISON_ROWS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.title}
                        className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4"
                      >
                        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <p className="text-xs sm:text-sm font-bold text-foreground">
                            {item.title}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                              <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                                Paket Gratis
                              </span>
                              <span className="text-muted-foreground">
                                {item.freeValue}
                              </span>
                            </div>
                            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                              <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-0.5">
                                Pembeli Pro
                              </span>
                              <span className="font-semibold text-foreground flex items-start gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                <span>{item.proValue}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* Subscription Payment History */}
            <Card className="rounded-2xl border-border/80 bg-card p-6 sm:p-7 space-y-4">
              <div className="border-b border-border/60 pb-3.5 flex items-center justify-between gap-2">
                <div>
                  <h2 className="type-subheading font-bold text-foreground">
                    Riwayat Pembayaran Langganan
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Catatan transaksi aktivasi dan perpanjangan Pembeli Pro melalui Midtrans Sandbox.
                  </p>
                </div>
                <span className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground tabular-nums font-semibold">
                  {sub.history.length} transaksi
                </span>
              </div>

              {sub.history.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/80 p-8 text-center text-xs text-muted-foreground">
                  Belum ada riwayat pembayaran langganan Pembeli Pro.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border/80">
                  <table className="w-full min-w-[680px] text-left text-xs border-collapse">
                    <thead className="bg-muted/60 border-b border-border/80 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="py-3 px-4">Order ID</th>
                        <th className="py-3 px-4">Periode Aktif</th>
                        <th className="py-3 px-4 text-right">Nominal</th>
                        <th className="py-3 px-4">Kanal Bayar</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {sub.history.map((item) => {
                        const statusMeta = getSubscriptionPaymentStatusLabel(item.status);
                        return (
                          <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="font-mono font-semibold text-foreground block">
                                {item.orderId}
                              </span>
                              <span className="text-[10px] text-muted-foreground tabular-nums">
                                {formatPaymentDateTime(item.createdAt)}
                              </span>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap tabular-nums text-foreground">
                              {item.periodStart && item.periodEnd ? (
                                <span>
                                  {formatPaymentDateTime(item.periodStart)} –{" "}
                                  {formatPaymentDateTime(item.periodEnd)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  +30 hari setelah lunas
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap font-bold tabular-nums text-foreground">
                              {formatRupiah(item.amount)}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap text-muted-foreground">
                              {formatPaymentChannel(item)}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${statusMeta.classes}`}
                              >
                                {statusMeta.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}
      </AsyncBoundary>
    </PageContainer>
  );
}
