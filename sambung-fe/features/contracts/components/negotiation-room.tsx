"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  Lock,
  Phone,
  MessageSquare,
  AlertTriangle,
  FileText,
  Copy,
  CheckCheck,
  AlertCircle,
  PenTool,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { useCurrentUser } from "@/features/auth/hooks/use-auth";
import {
  useContractCommand,
} from "../hooks/use-contracts";
import { formatRupiah } from "@/features/offers/components/offer-summary";
import { isContactRevealed, CONTRACT_STATUS_LABELS } from "../domain/state-machine";
import {
  PriceRangeSlider,
  usePriceReference,
  ConfirmRedLightDialog,
} from "@/features/price-check";
import { ContractService } from "../services/contract.service";
import { useMobile } from "@/hooks/use-mobile";
import type { Contract } from "../schemas";
import { SignatureDialog } from "./signature-dialog";
import { ShipConfirmDialog, ReceiveConfirmDialog } from "./fulfillment-dialogs";
import { ContractTimeline } from "./contract-timeline";
import { ContractPaymentCard } from "./contract-payment-card";
import { isContractPaid } from "../domain/payment-helpers";

interface PendingRedAction {
  action: "accept" | "counter";
  price: number;
  lowerBound: number;
  upperBound: number;
  redThreshold: number;
  referenceVersion: string;
}

export function NegotiationRoom({ contract }: { contract: Contract }) {
  const isMobile = useMobile();
  const { data: user } = useCurrentUser();
  const mutation = useContractCommand();

  const [counterModalOpen, setCounterModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [shipModalOpen, setShipModalOpen] = useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [proposedPrice, setProposedPrice] = useState(contract.currentPrice);
  const [counterNote, setCounterNote] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [isCheckingPrice, setIsCheckingPrice] = useState(false);
  const [pendingRedAction, setPendingRedAction] = useState<PendingRedAction | null>(null);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const isFarmer = user?.role === "petani";
  const partnerRole = isFarmer ? "Pembeli" : "Petani";
  const partnerName = isFarmer
    ? contract.buyerBusiness || contract.buyerName
    : contract.farmerBusiness || contract.farmerName;
  const partnerPhone = isFarmer ? contract.buyerPhone : contract.farmerPhone;

  const contactRevealed = isContactRevealed(contract.status);
  const isMyTurn = contract.status === "pending" && contract.currentTurnRole === user?.role;
  const hasUserSigned = isFarmer ? Boolean(contract.farmerSignature) : Boolean(contract.buyerSignature);
  const hasPartnerSigned = isFarmer ? Boolean(contract.buyerSignature) : Boolean(contract.farmerSignature);
  const bothSigned = Boolean(contract.farmerSignature && contract.buyerSignature);

  const { reference: liveRef } = usePriceReference(
    contract.grainType,
    contract.province || contract.regency,
  );
  const saved = contract.priceReference;
  const priceRef = {
    lowerBound: saved?.bounds.lowerOperational ?? liveRef?.lowerBound ?? 0,
    upperBound: saved?.bounds.upperOperational ?? liveRef?.upperBound ?? 0,
    toleranceDelta: saved
      ? (saved.deltaBp ?? 300) / 10000
      : (liveRef?.toleranceDelta ?? 0.03),
  };
  const path="/contracts/"+encodeURIComponent(contract.id)+"/";
  function quote(action:"accept"|"counter",price:number){
    return {action,price,regionId:contract.district,quality:contract.quality,grainType:contract.grainType};
  }
  const totalValue = contract.volumeKg * contract.currentPrice;
  const isPaid = isContractPaid(contract);

  // Calculate remaining deadline hours (negotiation & escrow payment deadlines)
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (contract.status !== "pending" && contract.status !== "signed") return;
    const intervalMs = contract.status === "signed" ? 60_000 : 10_000;
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [contract.status]);
  const hoursLeft=Math.max(0, Math.ceil((Date.parse(contract.expiresAt)-now)/3600000));

  async function executeConfirmedPriceAction(
    action: "accept" | "counter",
    extraBody: { referenceVersion?: string; redConfirmed?: boolean }
  ) {
    if (action === "accept") {
      await mutation.mutateAsync({
        path: path + "accept",
        body: {
          priceOfferVersion: contract.priceOfferVersion,
          ...extraBody,
        },
        quote: quote("accept", contract.currentPrice),
      });
      return;
    }

    await mutation.mutateAsync({
      path: path + "counter",
      quote: quote("counter", proposedPrice),
      body: {
        priceOfferVersion: contract.priceOfferVersion,
        proposedPrice,
        note: counterNote.trim() || undefined,
        ...extraBody,
      },
    });
    setCounterModalOpen(false);
    setCounterNote("");
    setModalError(null);
  }

  async function submitWithPricePreview(action: "accept" | "counter", price: number) {
    setModalError(null);
    mutation.reset();

    if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
      await executeConfirmedPriceAction(action, {});
      return;
    }

    setIsCheckingPrice(true);
    try {
      const check = await ContractService.preview(quote(action, price));
      if (check.requiresConfirmation) {
        const lowerBound = check.reference.bounds.lowerOperational;
        const deltaRatio = (check.reference.deltaBp ?? 300) / 10000;
        setPendingRedAction({
          action,
          price,
          lowerBound,
          upperBound: check.reference.bounds.upperOperational,
          redThreshold: Math.round(lowerBound * (1 - deltaRatio)),
          referenceVersion: check.reference.referenceVersion,
        });
        return;
      }

      await executeConfirmedPriceAction(action, {
        referenceVersion: check.reference.referenceVersion,
        redConfirmed: false,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gagal memproses penawaran harga.";
      if (action === "counter") {
        setModalError(message);
      }
    } finally {
      setIsCheckingPrice(false);
    }
  }

  async function handleAccept() {
    await submitWithPricePreview("accept", contract.currentPrice);
  }

  async function handleCounterSubmit() {
    if (proposedPrice <= 0) {
      setModalError("Nominal harga harus lebih besar dari Rp0.");
      return;
    }
    await submitWithPricePreview("counter", proposedPrice);
  }

  async function handleCancelSubmit() {
    setModalError(null);
    const trimmedReason = cancelReason.trim();
    if (trimmedReason.length < 5) {
      setModalError("Tuliskan alasan minimal 5 karakter agar mitra memahami kondisinya.");
      return;
    }
    try {
      await mutation.mutateAsync({
        path:
          path +
          (isFarmer &&
          contract.status === "pending" &&
          process.env.NEXT_PUBLIC_USE_MOCK !== "true"
            ? "reject"
            : "cancel"),
        body: {
          reason: trimmedReason,
        },
      });
      setCancelModalOpen(false);
      setModalError(null);
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : "Gagal membatalkan kesepakatan."
      );
    }
  }

  async function handleSignContract(data: { type: "draw" | "type"; signature: string }) {
    setModalError(null);
    try {
      await mutation.mutateAsync({
        path: path + "sign",
        body: data,
      });
      setSignModalOpen(false);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Gagal menyimpan tanda tangan kontrak.");
    }
  }

  async function handleShipContract(notes?: string) {
    setModalError(null);
    try {
      await mutation.mutateAsync({
        path: path + "ship",
        body: { notes },
      });
      setShipModalOpen(false);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Gagal mengonfirmasi pengiriman gabah.");
    }
  }

  async function handleReceiveContract(notes?: string) {
    setModalError(null);
    try {
      await mutation.mutateAsync({
        path: path + "receive",
        body: { notes },
      });
      setReceiveModalOpen(false);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Gagal mengonfirmasi penerimaan gabah.");
    }
  }

  function handleCopyPhone() {
    if (!partnerPhone) return;
    navigator.clipboard.writeText(partnerPhone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  }

  return (
    <PageContainer>
      <Link
        href="/kontrak"
        className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground transition mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
        {isMobile ? "Kembali" : "Kembali ke Daftar Kesepakatan"}
      </Link>

      <PageHeader
        title={`Ruang Kesepakatan — #${contract.id}`}
        description={`Negosiasi dan koordinasi komitmen pasokan antara ${contract.farmerName} dan ${contract.buyerName}.`}
        badge={
          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full ${
              contract.status === "approved" || contract.status === "signed"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
                : contract.status === "pending"
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300"
                : contract.status === "shipping" || contract.status === "completed"
                ? "bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {CONTRACT_STATUS_LABELS[contract.status].label}
          </span>
        }
      />

      {mutation.error && !counterModalOpen && !cancelModalOpen && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 text-xs text-destructive flex items-start gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{mutation.error.message}</span>
        </div>
      )}
      {/* Top Status Banner */}
      {contract.status === "pending" && (
        <div className="rounded-2xl border border-amber-300/70 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/30 p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-amber-950 dark:text-amber-200">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Batas Waktu Kesepakatan:</strong> Tersisa sekitar{" "}
              <strong>{hoursLeft} jam</strong> untuk merespons sebelum pesanan otomatis kedaluwarsa.
            </span>
          </div>
          <span className="font-semibold text-amber-800 dark:text-amber-400">
            {isMyTurn ? "Giliran Anda Bertindak" : `Menunggu Tindakan ${partnerRole}`}
          </span>
        </div>
      )}

      {contract.status === "approved" && (
        <div className="rounded-2xl border border-amber-300/80 bg-amber-50/90 dark:border-amber-900/60 dark:bg-amber-950/30 p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-amber-950 dark:text-amber-200">
          <div className="flex items-center gap-2.5">
            <PenTool className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Harga Disepakati:</strong> Lembar kesepakatan telah terbit. Silakan bubuhkan tanda tangan digital Anda agar kontrak ini sah dan mengikat.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="min-h-8 text-xs border-amber-400 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40"
            render={
              <Link href={`/kontrak/${contract.id}/bukti`}>
                <FileText className="w-3.5 h-3.5 mr-1.5" />
                {isMobile ? "Draf Kesepakatan" : "Lihat Draf Lembar Kesepakatan"}
              </Link>
            }
          />
        </div>
      )}

      {contract.status === "signed" && (
        <div
          className={`rounded-2xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs border ${
            isPaid
              ? "border-emerald-300/80 bg-emerald-50/90 dark:border-emerald-900/60 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200"
              : "border-amber-300/80 bg-amber-50/90 dark:border-amber-900/60 dark:bg-amber-950/30 text-amber-950 dark:text-amber-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {isPaid ? (
              <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span>
              {isPaid ? (
                <>
                  <strong>Pembayaran Escrow Terverifikasi — Siap Kirim Gabah:</strong> Dana ditahan aman di escrow SAMBUNG. Petani kini dapat mengonfirmasi pengiriman gabah.
                </>
              ) : (
                <>
                  <strong>Kontrak Sah — Menunggu Pembayaran Escrow:</strong> Kedua belah pihak telah menandatangani kesepakatan. Menunggu pembeli melunasi pembayaran escrow sebelum pengiriman gabah.
                </>
              )}
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className={`min-h-8 text-xs ${
              isPaid
                ? "border-emerald-400 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                : "border-amber-400 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40"
            }`}
            render={
              <Link href={`/kontrak/${contract.id}/bukti`}>
                <FileText className="w-3.5 h-3.5 mr-1.5" />
                {isMobile ? "Surat Kesepakatan" : "Surat Kesepakatan Digital"}
              </Link>
            }
          />
        </div>
      )}

      {contract.status === "shipping" && (
        <div className="rounded-2xl border border-blue-300/80 bg-blue-50/90 dark:border-blue-900/60 dark:bg-blue-950/30 p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-blue-950 dark:text-blue-200">
          <div className="flex items-center gap-2.5">
            <Truck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Gabah Sedang Dikirim:</strong> Petani telah memberangkatkan pasokan gabah menuju lokasi penerimaan pembeli.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="min-h-8 text-xs border-blue-400 text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40"
            render={
              <Link href={`/kontrak/${contract.id}/bukti`}>
                <FileText className="w-3.5 h-3.5 mr-1.5" />
                {isMobile ? "Surat Kesepakatan" : "Surat Kesepakatan Digital"}
              </Link>
            }
          />
        </div>
      )}

      {contract.status === "completed" && (
        <div className="rounded-2xl border border-emerald-300/70 bg-emerald-50/80 dark:border-emerald-900/60 dark:bg-emerald-950/30 p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-emerald-950 dark:text-emerald-200">
          <div className="flex items-center gap-2.5">
            <CheckCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              <strong>Transaksi Selesai:</strong> Pembeli telah mengonfirmasi penerimaan gabah.{" "}
              {contract.payment?.escrowStatus === "released"
                ? `Dana bersih sebesar ${formatRupiah(contract.payment.contractAmount)} telah dicairkan ke pihak petani.`
                : "Seluruh komitmen transaksi telah tuntas dilaksanakan."}
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="min-h-8 text-xs"
            render={
              <Link href={`/kontrak/${contract.id}/bukti`}>
                <FileText className="w-3.5 h-3.5 mr-1.5" />
                Cetak Bukti Kesepakatan
              </Link>
            }
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12 mb-8">
        {/* Left Column: Transaction Details & Timeline */}
        <div className="lg:col-span-7 space-y-6">
          {/* Summary Metric Cards */}
          <Card className="rounded-2xl border-border/80 bg-card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b border-border/60 pb-3">
              Rincian Komitmen Pasokan Gabah
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-xs">
              <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                <span className="text-muted-foreground text-xs block">Jenis Gabah</span>
                <span className="text-base font-bold text-foreground">
                  Gabah {contract.grainType}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                <span className="text-muted-foreground text-xs block">Volume Kesepakatan</span>
                <span className="text-base font-bold tabular-nums text-foreground">
                  {contract.volumeKg.toLocaleString("id-ID")} kg
                </span>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border/60 col-span-2 sm:col-span-1">
                <span className="text-muted-foreground text-xs block">Harga Terkini</span>
                <span className="text-base font-bold tabular-nums text-foreground">
                  {formatRupiah(contract.currentPrice)} / kg
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-muted/20 border border-border/50 flex justify-between items-baseline">
              <span className="text-xs font-semibold text-foreground">
                Estimasi Total Transaksi:
              </span>
              <span className="text-xl font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400">
                {formatRupiah(totalValue)}
              </span>
            </div>
          </Card>

          {/* Unified Contract Journey Timeline */}
          <ContractTimeline contract={contract} nowMs={now} />
        </div>

        {/* Right Column: Contact Details (BR-018) & Actions */}
        <div className="lg:col-span-5 space-y-6">
          {/* Contact Details Card (Strict BR-018 Masking) */}
          <Card className="rounded-2xl border-border/80 bg-card p-6 space-y-4">
            <div className="border-b border-border/60 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Informasi Kontak Mitra
                </h3>
                <p className="text-xs text-muted-foreground">
                  Pihak {partnerRole} dalam kesepakatan ini.
                </p>
              </div>
            </div>

            {!contactRevealed || !partnerPhone ? (
              <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-5 text-center space-y-2.5">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-foreground">
                    Kontak Dilindungi oleh SAMBUNG
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Nomor WhatsApp dan kontak mitra akan terbuka otomatis setelah kedua pihak menandatangani kontrak kesepakatan secara sah.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-muted-foreground text-xs block">Nama / Poktan</span>
                  <span className="text-sm font-bold text-foreground">{partnerName}</span>
                </div>

                <div>
                  <span className="text-muted-foreground text-xs block">Nomor Telepon / WhatsApp</span>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-sm font-bold text-foreground">
                      {partnerPhone}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-8 text-xs px-2.5"
                      onClick={handleCopyPhone}
                    >
                      <Copy className="w-3.5 h-3.5 mr-1" />
                      {copiedPhone ? "Tersalin!" : "Salin"}
                    </Button>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    className="w-full min-h-10 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => {
                      const cleanPhone = partnerPhone.replace(/\D/g, "");
                      window.open(`https://wa.me/62${cleanPhone.replace(/^(62|0)/, "")}`, "_blank");
                    }}
                  >
                    <Phone className="w-3.5 h-3.5 mr-2" />
                    Hubungi via WhatsApp
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Escrow Payment Card */}
          <ContractPaymentCard
            contract={contract}
            userRole={user?.role}
            nowMs={now}
          />

          {/* Action Controller Card */}
          <Card className="rounded-2xl border-border/80 bg-card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b border-border/60 pb-3">
              Tindakan Kesepakatan
            </h3>

            {/* When Pending */}
            {contract.status === "pending" && (
              <div className="space-y-3">
                {isMyTurn ? (
                  <>
                    <Button
                      className="w-full min-h-11 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={mutation.isPending || isCheckingPrice}
                      onClick={() => void handleAccept().catch(() => undefined)}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      {mutation.isPending || isCheckingPrice
                        ? "Memproses…"
                        : isMobile
                        ? `Setujui ${formatRupiah(contract.currentPrice)}`
                        : `Setujui Harga ${formatRupiah(contract.currentPrice)}/kg`}
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full min-h-11 text-xs font-semibold"
                      onClick={() => {
                        setProposedPrice(contract.currentPrice);
                        setModalError(null);
                        mutation.reset();
                        setCounterModalOpen(true);
                      }}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      {isMobile ? "Nego Harga" : "Ajukan Nego Harga Baru"}
                    </Button>

                    <Button
                      variant="ghost"
                      className="w-full min-h-9 text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        setModalError(null);
                        mutation.reset();
                        setCancelModalOpen(true);
                      }}
                    >
                      {isFarmer ? "Tolak pesanan" : "Batalkan pesanan"}
                    </Button>
                  </>
                ) : (
                  <div className="rounded-xl bg-muted/40 p-4 text-center space-y-2 border border-border/60">
                    <Clock className="w-5 h-5 text-muted-foreground mx-auto" />
                    <p className="text-xs font-medium text-foreground">
                      Menunggu Tanggapan dari {partnerRole}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Mitra sedang meninjau penawaran harga. Anda akan menerima pembaruan begitu ada respons.
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="min-h-8 text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => setCancelModalOpen(true)}
                    >
                      {isFarmer ? "Tolak pesanan" : "Batalkan pesanan"}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* When Approved: Waiting for Digital Signatures */}
            {contract.status === "approved" && (
              <div className="space-y-4">
                <div className="rounded-xl bg-muted/30 border border-border/70 p-3.5 space-y-2 text-xs">
                  <div className="flex justify-between font-semibold text-foreground border-b border-border/60 pb-2">
                    <span>Status Tanda Tangan:</span>
                    <span className="text-amber-700 dark:text-amber-400">
                      {bothSigned
                        ? "Lengkap (2/2)"
                        : hasUserSigned || hasPartnerSigned
                        ? "1 dari 2 Pihak"
                        : "Menunggu (0/2)"}
                    </span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Pihak Petani:</span>
                      <span className={contract.farmerSignature ? "text-emerald-700 dark:text-emerald-400 font-medium" : "text-amber-700 dark:text-amber-400 font-medium"}>
                        {contract.farmerSignature ? "✓ Sudah Tanda Tangan" : "Belum Tanda Tangan"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Pihak Pembeli:</span>
                      <span className={contract.buyerSignature ? "text-emerald-700 dark:text-emerald-400 font-medium" : "text-amber-700 dark:text-amber-400 font-medium"}>
                        {contract.buyerSignature ? "✓ Sudah Tanda Tangan" : "Belum Tanda Tangan"}
                      </span>
                    </div>
                  </div>
                </div>

                {!hasUserSigned ? (
                  <Button
                    className="w-full min-h-11 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={mutation.isPending}
                    onClick={() => {
                      setModalError(null);
                      setSignModalOpen(true);
                    }}
                  >
                    <PenTool className="w-4 h-4 mr-2" />
                    {isMobile ? "Tandatangani Kontrak" : "Tandatangani Surat Kesepakatan"}
                  </Button>
                ) : (
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 text-xs text-emerald-800 dark:text-emerald-200 text-center font-medium">
                    ✓ Anda telah membubuhkan tanda tangan. Menunggu tanda tangan dari {partnerRole}.
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full min-h-10 text-xs"
                  render={
                    <Link href={`/kontrak/${contract.id}/bukti`}>
                      <FileText className="w-3.5 h-3.5 mr-2" />
                      {isMobile ? "Draf Kesepakatan" : "Lihat Draf Surat Kesepakatan"}
                    </Link>
                  }
                />

                {/* Cancel allowed ONLY if NOT both signed */}
                <div className="pt-2 border-t border-border/60">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full min-h-8 text-xs text-muted-foreground hover:text-destructive cursor-pointer"
                    onClick={() => {
                      setCancelReason("");
                      setCancelModalOpen(true);
                    }}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                    {isMobile ? "Batalkan Kesepakatan" : "Kendala Lapangan / Batalkan Kesepakatan"}
                  </Button>
                </div>
              </div>
            )}

            {/* When Signed: Escrow Payment Gate & Ready for Shipping */}
            {contract.status === "signed" && (
              <div className="space-y-4">
                <div
                  className={`p-3.5 rounded-xl text-xs space-y-1.5 border ${
                    isPaid
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-900 dark:text-emerald-200"
                      : "bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-950 dark:text-amber-200"
                  }`}
                >
                  <p className="font-bold flex items-center gap-1.5">
                    {isPaid ? (
                      <CheckCheck className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Lock className="w-4 h-4 text-amber-600" />
                    )}
                    {isPaid
                      ? "Pembayaran Escrow Lunas — Siap Dikirim"
                      : "Kontrak Mengikat — Menunggu Pelunasan Escrow"}
                  </p>
                  <p className="text-xs leading-relaxed opacity-90">
                    {isPaid
                      ? "Dana escrow telah terverifikasi dan ditahan aman oleh sistem. Kesepakatan mengikat dan siap menuju tahap pengiriman."
                      : "Kedua belah pihak telah melengkapi tanda tangan. Pembeli perlu menyelesaikan pembayaran escrow melalui Midtrans Sandbox sebelum pengiriman gabah dapat dikonfirmasi."}
                  </p>
                </div>

                {isFarmer ? (
                  <div className="space-y-2">
                    <Button
                      className={`w-full min-h-11 text-xs font-semibold ${
                        isPaid
                          ? "bg-blue-600 hover:bg-blue-700 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                      disabled={mutation.isPending || !isPaid}
                      onClick={() => setShipModalOpen(true)}
                    >
                      {isPaid ? (
                        <Truck className="w-4 h-4 mr-2" />
                      ) : (
                        <Lock className="w-4 h-4 mr-2" />
                      )}
                      {isMobile ? "Kirim Gabah" : "Konfirmasi Pengiriman Gabah"}
                    </Button>
                    {!isPaid && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed text-center">
                        Tombol pengiriman akan terbuka otomatis setelah pembayaran escrow pembeli terverifikasi lunas.
                      </p>
                    )}
                  </div>
                ) : !isPaid ? (
                  <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 text-xs text-muted-foreground text-center space-y-1">
                    <Clock className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                    <p className="font-medium text-foreground">
                      Selesaikan Pembayaran Escrow
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      Gunakan kartu <strong>Pembayaran Escrow (Midtrans Sandbox)</strong> di atas untuk melunasi tagihan agar petani dapat segera memberangkatkan gabah.
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 text-xs text-muted-foreground text-center space-y-1">
                    <Truck className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                    <p className="font-medium text-foreground">Menunggu Pengiriman dari Petani</p>
                    <p className="text-[11px] leading-relaxed">
                      Dana escrow Anda sudah ditahan aman. Petani sedang menyiapkan armada angkut dan akan mengonfirmasi saat gabah diberangkatkan.
                    </p>
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full min-h-10 text-xs"
                  render={
                    <Link href={`/kontrak/${contract.id}/bukti`}>
                      <FileText className="w-3.5 h-3.5 mr-2" />
                      {isMobile ? "Surat Kesepakatan" : "Buka Surat Kesepakatan Digital"}
                    </Link>
                  }
                />
              </div>
            )}

            {/* When Shipping: Sequential Fulfillment Step 2 */}
            {contract.status === "shipping" && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-300 text-xs text-blue-900 dark:text-blue-200 space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-blue-600" />
                    Gabah Sedang Dikirim
                  </p>
                  <p className="text-xs leading-relaxed opacity-90">
                    Armada pengangkut sedang menuju lokasi penerima. Silakan lakukan pemeriksaan fisik mutu dan timbangan setibanya di lokasi.
                  </p>
                </div>

                {!isFarmer ? (
                  <Button
                    className="w-full min-h-11 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={mutation.isPending}
                    onClick={() => setReceiveModalOpen(true)}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {isMobile ? "Konfirmasi Terima" : "Konfirmasi Penerimaan Gabah (Selesai)"}
                  </Button>
                ) : (
                  <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 text-xs text-muted-foreground text-center space-y-1">
                    <CheckCircle2 className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                    <p className="font-medium text-foreground">Menunggu Penerimaan dari Pembeli</p>
                    <p className="text-[11px] leading-relaxed">
                      Gabah sedang dalam perjalanan. Menunggu pembeli menerima dan memeriksa kondisi barang di lokasi.
                    </p>
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full min-h-10 text-xs"
                  render={
                    <Link href={`/kontrak/${contract.id}/bukti`}>
                      <FileText className="w-3.5 h-3.5 mr-2" />
                      {isMobile ? "Surat Kesepakatan" : "Buka Surat Kesepakatan Digital"}
                    </Link>
                  }
                />
              </div>
            )}

            {/* When Completed */}
            {contract.status === "completed" && (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 text-xs text-emerald-900 dark:text-emerald-200 text-center space-y-1">
                  <p className="font-bold">Transaksi Selesai Bersama</p>
                  <p className="text-xs opacity-90">
                    Kedua belah pihak telah menyelesaikan komitmen pasokan ini dengan sukses dan tuntas.
                  </p>
                </div>

                <Button
                  className="w-full min-h-10 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                  render={
                    <Link href={`/kontrak/${contract.id}/bukti`}>
                      <FileText className="w-3.5 h-3.5 mr-2" />
                      {isMobile ? "Cetak Bukti" : "Cetak Surat Bukti Kesepakatan"}
                    </Link>
                  }
                />
              </div>
            )}

            {/* When Cancelled / Rejected */}
            {(contract.status === "cancelled" || contract.status === "rejected") && (
              <div className="p-4 rounded-xl bg-muted/60 border border-border/80 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Kesepakatan Berakhir</p>
                {contract.cancelReason && (
                  <p className="text-xs italic">
                    Alasan: &ldquo;{contract.cancelReason}&rdquo;
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Modal: Counter-Offer Price Slider */}
      <Dialog
        open={counterModalOpen}
        onOpenChange={(open) => {
          setCounterModalOpen(open);
          if (!open) setModalError(null);
        }}
      >
        <DialogContent className="w-full max-w-md sm:max-w-3xl lg:max-w-6xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              Ajukan Nego Harga Baru
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Tentukan harga baru per kilogram untuk diajukan kembali kepada {partnerRole}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <PriceRangeSlider
              value={proposedPrice}
              min={5000}
              max={10000}
              lowerBound={priceRef.lowerBound}
              upperBound={priceRef.upperBound}
              toleranceDelta={priceRef.toleranceDelta}
              onChange={setProposedPrice}
              label={`Harga Nego Baru (Gabah ${contract.grainType})`}
            />

            <div className="space-y-1.5">
              <label htmlFor="counterNote" className="text-xs font-semibold text-foreground">
                Pesan / Catatan Nego (Opsional)
              </label>
              <textarea
                id="counterNote"
                rows={2}
                value={counterNote}
                onChange={(e) => setCounterNote(e.target.value)}
                placeholder="Tuliskan alasan penyesuaian harga..."
                className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {modalError && (
              <div
                role="alert"
                className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-10 text-xs"
              onClick={() => setCounterModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              className="min-h-10 text-xs font-semibold"
              disabled={mutation.isPending || isCheckingPrice || proposedPrice <= 0}
              onClick={() => void handleCounterSubmit().catch(() => undefined)}
            >
              {mutation.isPending || isCheckingPrice ? "Mengirim Nego…" : "Kirim Nego Harga"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Cancel / Reject Contract */}
      <Dialog
        open={cancelModalOpen}
        onOpenChange={(open) => {
          setCancelModalOpen(open);
          if (!open) setModalError(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              {contract.status === "approved" ? "Batalkan Kesepakatan Terikat" : "Batalkan Pesanan Pasokan"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {contract.status === "approved"
                ? "Kesepakatan yang telah disetujui akan dihentikan. Volume gabah (tonase) akan otomatis dikembalikan ke status tersedia di katalog."
                : "Volume yang sebelumnya dicadangkan akan dikembalikan ke katalog pasokan."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <label htmlFor="cancelReason" className="text-xs font-semibold text-foreground block">
              Alasan Pembatalan <span className="text-destructive">*</span>
            </label>

            {/* Quick reason chips */}
            <div className="flex flex-wrap gap-1.5">
              {(contract.status === "approved"
                ? [
                    "Armada angkut terkendala",
                    "Mutu gabah tidak sesuai saat inspeksi",
                    "Kondisi cuaca ekstrem / darurat",
                    "Kesepakatan bersama kedua belah pihak",
                  ]
                : [
                    "Kesepakatan harga tidak tercapai",
                    "Kapasitas gudang penuh",
                    "Perubahan jadwal panen",
                    "Alasan operasional lainnya",
                  ]
              ).map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setCancelReason(chip)}
                  className="px-2.5 py-1 rounded-lg border border-border/70 bg-muted/40 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>

            <textarea
              id="cancelReason"
              rows={3}
              required
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder={
                contract.status === "approved"
                  ? "Tuliskan rincian kendala lapangan yang menyebabkan transaksi ini batal..."
                  : "Contoh: Kesepakatan harga tidak tercapai, atau kapasitas gudang penuh..."
              }
              className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            />

            {modalError && (
              <div
                role="alert"
                className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-10 text-xs"
              onClick={() => setCancelModalOpen(false)}
            >
              Kembali
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="min-h-10 text-xs font-semibold"
              disabled={mutation.isPending || !cancelReason.trim()}
              onClick={() => void handleCancelSubmit().catch(() => undefined)}
            >
              {mutation.isPending ? "Membatalkan…" : isMobile ? "Ya, Batalkan" : "Ya, Batalkan Kesepakatan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmRedLightDialog
        open={Boolean(pendingRedAction)}
        onOpenChange={(open) => {
          if (!open) setPendingRedAction(null);
        }}
        price={pendingRedAction?.price ?? proposedPrice}
        lowerBound={pendingRedAction?.lowerBound ?? priceRef.lowerBound}
        upperBound={pendingRedAction?.upperBound ?? priceRef.upperBound}
        redThreshold={pendingRedAction?.redThreshold ?? 0}
        onConfirm={() => {
          if (!pendingRedAction) return;
          const pending = pendingRedAction;
          setPendingRedAction(null);
          void executeConfirmedPriceAction(pending.action, {
            referenceVersion: pending.referenceVersion,
            redConfirmed: true,
          }).catch((err) => {
            if (pending.action === "counter") {
              setModalError(
                err instanceof Error ? err.message : "Gagal mengirim penawaran harga."
              );
            }
          });
        }}
      />

      <SignatureDialog
        open={signModalOpen}
        onOpenChange={setSignModalOpen}
        signerName={user?.name || ""}
        roleTitle={isFarmer ? "Petani" : "Pembeli"}
        onConfirm={handleSignContract}
        isSubmitting={mutation.isPending}
      />

      <ShipConfirmDialog
        open={shipModalOpen}
        onOpenChange={setShipModalOpen}
        contract={contract}
        onConfirm={handleShipContract}
        isSubmitting={mutation.isPending}
      />

      <ReceiveConfirmDialog
        open={receiveModalOpen}
        onOpenChange={setReceiveModalOpen}
        contract={contract}
        onConfirm={handleReceiveContract}
        isSubmitting={mutation.isPending}
      />
    </PageContainer>
  );
}
