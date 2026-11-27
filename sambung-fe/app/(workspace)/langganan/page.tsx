"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart3,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Crown,
  ExternalLink,
  Percent,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AsyncBoundary } from "@/components/shared/async-boundary";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { authKeys, useCurrentUser } from "@/features/auth/hooks/use-auth";
import {
  formatPaymentChannel,
  formatPaymentDateTime,
} from "@/features/contracts/domain/payment-helpers";
import { openSnapCheckout } from "@/features/contracts/lib/midtrans-snap";
import { formatRupiah } from "@/features/offers/components/offer-summary";
import { ProBadge } from "@/features/subscription/components/pro-badge";
import { sanitizeSubscriptionReturnPath } from "@/features/subscription/domain/return-path";
import {
  subscriptionKeys,
  useCancelSubscription,
  useCheckoutSubscription,
  useMySubscription,
  useSyncSubscription,
} from "@/features/subscription/hooks/use-subscription";
import { ApiError } from "@/lib/api/errors";
import { IS_MOCK_DATA } from "@/lib/config/fe-mode";

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
        classes: "bg-primary/15 text-primary border border-primary/30",
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
        classes:
          "bg-destructive/15 text-destructive border border-destructive/40",
      };
    case "failed":
      return {
        label: "Gagal",
        classes:
          "bg-destructive/15 text-destructive border border-destructive/40",
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
    title: "Riwayat Harga & Unduh Data (/harga & /katalog)",
    freeValue: "Data 4, 8, dan 12 minggu terakhir (tanpa unduh data)",
    proValue: "Data lengkap sejak 2019 (35 wilayah) + unduh file Excel/CSV",
  },
  {
    icon: TrendingUp,
    title: "Perkiraan Harga & Peta Wilayah (/prakiraan & /peta)",
    freeValue:
      "Hanya provinsi Anda (tanpa rincian pemicu harga & peringkat wilayah)",
    proValue:
      "Semua provinsi, rincian pemicu harga, tabel peringkat & unduh data peta",
  },
  {
    icon: Percent,
    title: "Biaya Layanan Pembayaran Kontrak",
    freeValue: "0,5% dari nilai gabah (ditanggung Produsen)",
    proValue: "0,25% dari nilai gabah — hemat setengahnya",
  },
  {
    icon: Award,
    title: "Tanda Produsen Pro",
    freeValue: "Akun Produsen standar",
    proValue: "Ikon Mahkota Produsen Pro di profil dan halaman kontrak",
  },
] as const;

function SubscriptionPageContent() {
  const searchParams = useSearchParams();
  const returnPath = sanitizeSubscriptionReturnPath(searchParams.get("from"));
  const queryClient = useQueryClient();

  const { data: user, isLoading: isUserLoading } = useCurrentUser();
  const isBuyer = user?.role === "pembeli";

  const subQuery = useMySubscription({ enabled: isBuyer });
  const checkoutMutation = useCheckoutSubscription();
  const syncMutation = useSyncSubscription();
  const cancelMutation = useCancelSubscription();

  const [localError, setLocalError] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);
  const [isOpeningCheckout, setIsOpeningCheckout] = useState(false);
  const popupHandledRef = useRef(false);

  const sub = subQuery.data;
  const latestPayment = sub?.latestPayment ?? null;
  const isBusy =
    checkoutMutation.isPending ||
    syncMutation.isPending ||
    cancelMutation.isPending ||
    isOpeningCheckout;
  const safeRedirectUrl = getSafeSandboxRedirectUrl(latestPayment?.redirectUrl);
  const paymentConfigured = Boolean(sub?.midtransConfigured ?? true);

  const latestPendingOrderId =
    latestPayment?.status === "pending" ? latestPayment.orderId : null;
  const syncOrder = syncMutation.mutateAsync;

  useEffect(() => {
    if (!latestPendingOrderId || isOpeningCheckout) return;

    let inFlight = false;
    const runSilentSync = async () => {
      if (inFlight || document.visibilityState !== "visible") return;
      inFlight = true;
      try {
        const res = await syncOrder({ orderId: latestPendingOrderId });
        if (res.payment.status === "paid") {
          toast.success(
            "Pembayaran diterima! Produsen Pro Anda sekarang aktif."
          );
        }
      } catch {
        // Silent background sync; manual check button handles visible error feedback.
      } finally {
        inFlight = false;
      }
    };

    const intervalId = window.setInterval(() => {
      void runSilentSync();
    }, 6000);

    const onFocus = () => {
      void runSilentSync();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
    };
  }, [latestPendingOrderId, isOpeningCheckout, syncOrder]);

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
      const res = await syncMutation.mutateAsync(
        orderId ? { orderId } : undefined
      );
      setLocalError(null);
      if (res.payment.status === "paid") {
        toast.success(
          "Produsen Pro sudah aktif! Semua data harga lengkap dan diskon biaya layanan 0,25% siap digunakan."
        );
      } else if (res.awaitingMethodSelection) {
        toast.info(
          "Tagihan masih aktif. Silakan pilih metode pembayaran yang Anda inginkan."
        );
      } else if (res.payment.status === "pending") {
        toast.info("Tagihan masih menunggu pembayaran diselesaikan.");
      } else if (
        ["failed", "expired", "cancelled"].includes(res.payment.status)
      ) {
        toast.warning(
          "Tagihan sebelumnya sudah tidak aktif. Anda dapat membuat tagihan baru."
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
    if (!paymentConfigured) {
      setLocalError(
        "Pembayaran online belum aktif di server saat ini. Hubungi pengawas sistem atau coba lagi nanti."
      );
      return;
    }

    setLocalError(null);
    popupHandledRef.current = false;
    setIsOpeningCheckout(true);

    try {
      const session = await checkoutMutation.mutateAsync({ recreate });
      if (IS_MOCK_DATA) {
        await runSyncAfterPopup("success", session.payment.orderId);
        return;
      }

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
          "Halaman pembayaran dibuka di tab baru. Setelah selesai membayar, tekan Cek Status Pembayaran."
        );
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Gagal menyiapkan halaman pembayaran. Silakan coba lagi.";
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
        toast.success("Pembayaran diterima! Produsen Pro Anda sekarang aktif.");
      } else if (res.awaitingMethodSelection) {
        toast.info(
          "Anda belum memilih metode pembayaran. Silakan selesaikan pembayaran atau ganti metode."
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
          : "Gagal memeriksa status pembayaran langganan.";
      setLocalError(msg);
      toast.error(msg);
    }
  }

  async function handleCancelPending() {
    setLocalError(null);
    try {
      await cancelMutation.mutateAsync(
        latestPayment?.orderId ? { orderId: latestPayment.orderId } : undefined
      );
      toast.info("Tagihan langganan berhasil dibatalkan.");
    } catch (err) {
      if (err instanceof ApiError && err.code === "ALREADY_SETTLED") {
        toast.success(
          "Pembayaran Anda ternyata sudah lunas! Produsen Pro sekarang aktif."
        );
        void queryClient.invalidateQueries({ queryKey: subscriptionKeys.me() });
        void queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });
        void queryClient.invalidateQueries({ queryKey: ["price-history"] });
        void queryClient.invalidateQueries({ queryKey: ["forecasts"] });
        void queryClient.invalidateQueries({ queryKey: ["spatial-disparity"] });
        void queryClient.invalidateQueries({ queryKey: ["contracts"] });
        return;
      }
      const msg =
        err instanceof Error
          ? err.message
          : "Gagal membatalkan tagihan langganan.";
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
          title="Keanggotaan SAMBUNG"
          description="Informasi keanggotaan dan keterbukaan fitur pada platform SAMBUNG."
        />
        {returnPath && (
          <div className="mb-5">
            <ButtonLink
                href={returnPath}
              variant="outline"
              size="sm"
              className="min-h-9 text-xs cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              Kembali ke Fitur Sebelumnya
            </ButtonLink>
          </div>
        )}
        <Card className="rounded-2xl border-border/80 bg-card p-6 sm:p-8 max-w-2xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                {isFarmer
                  ? "Akun Petani Gratis Selamanya"
                  : "Akun Pengawas Tidak Perlu Berlangganan"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isFarmer
                  ? "Semua fitur petani gratis penuh dan hasil jual gabah diterima 100% tanpa potongan."
                  : "Semua halaman pengawasan, data harga, dan perkiraan harga sudah terbuka."}
              </p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {isFarmer
              ? "Anda sudah bisa melihat riwayat harga sejak 2019, mengunduh data tabel, melihat perkiraan harga di semua provinsi, dan menerima hasil penjualan gabah 100% utuh tanpa potongan. Paket Produsen Pro hanya untuk akun Produsen / Penggilingan."
              : "Paket Produsen Pro hanya berlaku untuk akun Produsen / Penggilingan."}
          </p>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Produsen Pro"
        description="Buka riwayat harga lengkap sejak 2019, perkiraan harga di semua provinsi beserta penyebabnya, unduh data tabel, dan hemat 50% biaya layanan transaksi."
      />

      {returnPath && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <ButtonLink
            href={returnPath}
            variant="outline"
            size="sm"
            className="min-h-9 text-xs cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Kembali ke Fitur Sebelumnya
          </ButtonLink>
        </div>
      )}

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
              {/* Left Column: Current Status & Checkout */}
              <Card className="lg:col-span-5 rounded-2xl border-border/80 bg-card p-6 sm:p-7 space-y-5">
                <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-4">
                  <div>
                    <span className="text-xs font-semibold text-primary">
                      Status Paket Anda
                    </span>
                    <h2 className="type-subheading font-bold text-foreground mt-0.5">
                      {sub.isPro ? "Produsen Pro Aktif" : "Paket Produsen Gratis"}
                    </h2>
                  </div>
                  {sub.isPro ? (
                    <ProBadge size="sm" />
                  ) : (
                    <Badge variant="outline" className="text-xs font-semibold">
                      {sub.status === "expired"
                        ? "Masa Aktif Berakhir"
                        : "Paket Gratis"}
                    </Badge>
                  )}
                </div>

                {/* Price & Period Info */}
                <div className="rounded-xl bg-muted/35 border border-border/70 p-4 space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Biaya Langganan Produsen Pro
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
                        <span className="text-muted-foreground">
                          Berlaku Hingga
                        </span>
                        <span className="font-bold text-primary tabular-nums">
                          {formatPaymentDateTime(sub.proExpiresAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">
                          Sisa Masa Aktif
                        </span>
                        <span className="font-semibold text-foreground tabular-nums">
                          {sub.remainingDays} hari lagi
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground pt-1 leading-relaxed">
                        Jika diperpanjang sebelum habis, masa aktif langsung
                        ditambah +30 hari dari tanggal berakhir tanpa memotong
                        sisa hari Anda.
                      </p>
                    </div>
                  ) : (
                    <p className="pt-2 border-t border-border/50 text-[11px] text-muted-foreground leading-relaxed">
                      Bayar manual Rp99.000 per 30 hari hanya saat dibutuhkan —
                      tidak ada perpanjangan atau pemotongan saldo otomatis.
                      Petani tetap menerima 100% hasil panen tanpa potongan.
                    </p>
                  )}
                </div>

                {!sub.isPro && sub.status === "expired" && sub.proExpiresAt && (
                  <div className="rounded-xl border border-amber-300/80 bg-amber-50/75 dark:border-amber-800/70 dark:bg-amber-950/30 p-3.5 text-xs text-amber-950 dark:text-amber-200 flex items-start gap-2.5 leading-relaxed">
                    <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <span>
                      Masa aktif Produsen Pro Anda berakhir pada{" "}
                      <strong>{formatPaymentDateTime(sub.proExpiresAt)}</strong>.
                      Aktifkan kembali kapan saja untuk membuka data historis
                      lengkap dan tarif biaya layanan 0,25%.
                    </span>
                  </div>
                )}

                {sub.isPro && returnPath && (
                  <ButtonLink
                    href={returnPath}
                    variant="secondary"
                    className="w-full min-h-10 text-xs font-semibold cursor-pointer"
                  >
                    <span>Lanjutkan ke Fitur Sebelumnya</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </ButtonLink>
                )}

                {!paymentConfigured && !IS_MOCK_DATA && (
                  <div
                    role="alert"
                    className="rounded-xl border border-amber-400/80 bg-amber-50/85 dark:border-amber-800/70 dark:bg-amber-950/35 p-3.5 text-xs text-amber-950 dark:text-amber-200 flex items-start gap-2.5 leading-relaxed"
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <span>
                      Pembayaran online sedang tidak tersedia karena konfigurasi
                      pembayaran di server belum aktif. Hubungi admin atau coba
                      lagi nanti.
                    </span>
                  </div>
                )}

                {localError && (
                  <div
                    role="alert"
                    className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{localError}</span>
                  </div>
                )}

                {/* Pending Checkout Details */}
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
                    {latestPayment.expiresAt && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">
                          Batas Pembayaran
                        </span>
                        <span className="font-medium text-foreground tabular-nums">
                          {formatPaymentDateTime(latestPayment.expiresAt)}
                        </span>
                      </div>
                    )}
                    {(latestPayment.paymentChannel ||
                      latestPayment.paymentType) && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">
                          Metode Pembayaran
                        </span>
                        <span className="font-semibold text-foreground">
                          {formatPaymentChannel(latestPayment)}
                        </span>
                      </div>
                    )}
                    {latestPayment.paymentReference && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">
                          Kode / Nomor Pembayaran
                        </span>
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
                    disabled={isBusy || (!paymentConfigured && !IS_MOCK_DATA)}
                    onClick={() => void handleCheckout(false)}
                    className="w-full min-h-11 text-xs font-semibold cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {checkoutMutation.isPending || isOpeningCheckout
                      ? "Menyiapkan Tagihan…"
                      : latestPayment?.status === "pending"
                      ? "Lanjutkan Pembayaran"
                      : sub.isPro
                      ? `Perpanjang +30 Hari (${formatRupiah(sub.priceIdr)})`
                      : `Aktifkan Produsen Pro (${formatRupiah(sub.priceIdr)})`}
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
                          disabled={
                            isBusy || (!paymentConfigured && !IS_MOCK_DATA)
                          }
                          onClick={() => void handleCheckout(true)}
                        >
                          Ganti Metode Pembayaran
                        </Button>
                      )}
                    </div>
                  )}

                  {latestPayment?.status === "pending" && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full min-h-9 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                      disabled={isBusy}
                      onClick={() => void handleCancelPending()}
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1.5" />
                      {cancelMutation.isPending
                        ? "Membatalkan…"
                        : "Batalkan Tagihan"}
                    </Button>
                  )}

                  {latestPayment?.status === "pending" && !IS_MOCK_DATA && (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground">
                      {safeRedirectUrl && (
                        <a
                          href={safeRedirectUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 hover:text-foreground underline underline-offset-2"
                        >
                          Buka Halaman Pembayaran
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <a
                        href={MIDTRANS_SIMULATOR_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 hover:text-foreground underline underline-offset-2"
                      >
                        Simulator Pembayaran (Uji Coba)
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
                      Perbandingan Paket Gratis vs Produsen Pro
                    </h2>
                  </div>
                  <Crown className="w-5 h-5 text-amber-500 shrink-0" />
                </div>

                <Table>
                  <TableHeader>
                    <TableRow className="border-border/60 hover:bg-transparent">
                      <TableHead className="px-2 py-2.5 text-xs font-semibold text-muted-foreground whitespace-normal">
                        Fitur
                      </TableHead>
                      <TableHead className="px-2 py-2.5 text-xs font-semibold text-muted-foreground whitespace-normal">
                        Paket Gratis
                      </TableHead>
                      <TableHead className="px-2 py-2.5 text-xs font-bold text-primary whitespace-normal">
                        Produsen Pro
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {PLAN_COMPARISON_ROWS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <TableRow
                          key={item.title}
                          className="border-border/60 hover:bg-muted/30"
                        >
                          <TableCell className="px-2 py-3.5 align-top whitespace-normal text-xs font-semibold text-foreground">
                            <div className="flex items-start gap-2">
                              <Icon
                                className="w-4 h-4 text-primary shrink-0 mt-0.5"
                                aria-hidden="true"
                              />
                              <span>{item.title}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-2 py-3.5 align-top whitespace-normal text-xs text-muted-foreground leading-relaxed">
                            {item.freeValue}
                          </TableCell>
                          <TableCell className="px-2 py-3.5 align-top whitespace-normal text-xs font-semibold text-foreground leading-relaxed">
                            <div className="flex items-start gap-1.5">
                              <CheckCircle2
                                className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5"
                                aria-hidden="true"
                              />
                              <span>{item.proValue}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
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
                    Catatan transaksi aktivasi dan perpanjangan Produsen Pro Anda.
                  </p>
                </div>
                <span className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground tabular-nums font-semibold">
                  {sub.history.length} transaksi
                </span>
              </div>

              {sub.history.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/80 p-8 text-center text-xs text-muted-foreground">
                  Belum ada riwayat pembayaran Produsen Pro.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border/80">
                  <table className="w-full min-w-[680px] text-left text-xs border-collapse">
                    <thead className="bg-muted/60 border-b border-border/80 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="py-3 px-4">Nomor Tagihan</th>
                        <th className="py-3 px-4">Masa Aktif</th>
                        <th className="py-3 px-4 text-right">Nominal</th>
                        <th className="py-3 px-4">Metode Bayar</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {sub.history.map((item) => {
                        const statusMeta = getSubscriptionPaymentStatusLabel(
                          item.status
                        );
                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-muted/30 transition-colors"
                          >
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

export default function SubscriptionPage() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <PageHeader
            title="Produsen Pro"
            description="Memuat informasi langganan Anda…"
          />
        </PageContainer>
      }
    >
      <SubscriptionPageContent />
    </Suspense>
  );
}
