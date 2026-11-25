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
  Wheat,
  MapPin,
  Calendar,
  AlertTriangle,
  FileText,
  Copy,
  CheckCheck,
  Send,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { PriceRangeSlider, PriceReferenceService } from "@/features/price-check";
import { useMobile } from "@/hooks/use-mobile";
import type { Contract } from "../schemas";

export function NegotiationRoom({ contract }: { contract: Contract }) {
  const isMobile = useMobile();
  const { data: user } = useCurrentUser();
  const mutation=useContractCommand();

  const [counterModalOpen, setCounterModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [proposedPrice, setProposedPrice] = useState(contract.currentPrice);
  const [counterNote, setCounterNote] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [copiedPhone, setCopiedPhone] = useState(false);

  const isFarmer = user?.role === "petani";
  const partnerRole = isFarmer ? "Pembeli" : "Petani";
  const partnerName = isFarmer
    ? contract.buyerBusiness || contract.buyerName
    : contract.farmerBusiness || contract.farmerName;
  const partnerPhone = isFarmer ? contract.buyerPhone : contract.farmerPhone;

  const contactRevealed = isContactRevealed(contract.status);
  const isMyTurn = contract.status === "pending" && contract.currentTurnRole === user?.role;
  const hasUserConfirmed = isFarmer ? contract.farmerConfirmed : contract.buyerConfirmed;
  const hasPartnerConfirmed = isFarmer ? contract.buyerConfirmed : contract.farmerConfirmed;

  const saved=contract.priceReference;
  const priceRef=process.env.NEXT_PUBLIC_USE_MOCK==="true"?PriceReferenceService.getReference(contract.grainType,contract.regency):
    {lowerBound:saved?.bounds.lowerOperational ?? 0,upperBound:saved?.bounds.upperOperational ?? 0,toleranceDelta:(saved?.deltaBp ?? 300)/10000};
  const path="/contracts/"+encodeURIComponent(contract.id)+"/";
  function quote(action:"accept"|"counter",price:number){
    return {action,price,regionId:contract.district,quality:contract.quality,grainType:contract.grainType};
  }
  const totalValue = contract.volumeKg * contract.currentPrice;

  // Calculate remaining deadline hours
  const [now,setNow]=useState(()=>Date.now());
  useEffect(()=>{
    if(contract.status!=="pending") return;
    const timer=setInterval(()=>setNow(Date.now()),10000);
    return ()=>clearInterval(timer);
  },[contract.status]);
  const hoursLeft=Math.max(0, Math.ceil((Date.parse(contract.expiresAt)-now)/3600000));

  async function handleAccept() {
    await mutation.mutateAsync({path:path+"accept",body:{priceOfferVersion:contract.priceOfferVersion},quote:quote("accept",contract.currentPrice)});
  }

  async function handleCounterSubmit() {
    if (proposedPrice <= 0) return;
    await mutation.mutateAsync({path:path+"counter",quote:quote("counter",proposedPrice),body:{priceOfferVersion:contract.priceOfferVersion,
        proposedPrice,
        note: counterNote.trim() || undefined,
      },
    });
    setCounterModalOpen(false);
    setCounterNote("");
  }

  async function handleCancelSubmit() {
    if (!cancelReason.trim()) return;
    await mutation.mutateAsync({path:path+(isFarmer && contract.status==="pending" && process.env.NEXT_PUBLIC_USE_MOCK!=="true"?"reject":"cancel"),body:{
        reason: cancelReason.trim(),
      },
    });
    setCancelModalOpen(false);
  }

  async function handleConfirmPhysical() {
    await mutation.mutateAsync({path:path+"confirm",body:{}});
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
              contract.status === "approved"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
                : contract.status === "pending"
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300"
                : contract.status === "completed"
                ? "bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {CONTRACT_STATUS_LABELS[contract.status].label}
          </span>
        }
      />

      {mutation.error && <p role="alert">{mutation.error.message}</p>}
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
        <div className="rounded-2xl border border-emerald-300/70 bg-emerald-50/80 dark:border-emerald-900/60 dark:bg-emerald-950/30 p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-emerald-950 dark:text-emerald-200">
          <div className="flex items-center gap-2.5">
            <span>
              <strong>Kesepakatan Sah & Terikat:</strong> Harga telah disetujui bersama. Silakan hubungi mitra melalui nomor kontak yang telah terbuka di bawah ini.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="min-h-8 text-xs border-emerald-400 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100"
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
        <div className="rounded-2xl border border-blue-300/70 bg-blue-50/80 dark:border-blue-900/60 dark:bg-blue-950/30 p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-blue-950 dark:text-blue-200">
          <div className="flex items-center gap-2.5">
            <CheckCheck className="w-5 h-5 text-blue-600 shrink-0" />
            <span>
              <strong>Transaksi Selesai:</strong> Kedua belah pihak telah mengonfirmasi bahwa serah terima fisik gabah dan transaksi di lapangan telah tuntas.
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

          {/* Negotiation History Timeline */}
          <Card className="rounded-2xl border-border/80 bg-card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 border-b border-border/60 pb-3">
              <MessageSquare className="w-4 h-4 text-primary" />
              Histori Penawaran & Negosiasi Harga
            </h3>

            <div className="space-y-4">
              {contract.history.map((hist, idx) => {
                const isAuthorMe = hist.role === user?.role;
                return (
                  <div
                    key={hist.id || idx}
                    className={`flex flex-col ${
                      isAuthorMe ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-4 space-y-1.5 text-xs ${
                        isAuthorMe
                          ? "bg-primary text-primary-foreground rounded-br-xs"
                          : "bg-muted/70 text-foreground border border-border/60 rounded-bl-xs"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4 text-xs opacity-80">
                        <span className="font-semibold">{hist.authorName}</span>
                        <span>
                          {new Date(hist.timestamp).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div className="pt-0.5">
                        <span className="text-sm font-bold tabular-nums block">
                          Tawaran Harga: {formatRupiah(hist.price)} / kg
                        </span>
                      </div>

                      {hist.note && (
                        <p className="pt-1 opacity-90 leading-relaxed border-t border-current/20">
                          {hist.note}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
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
                    Nomor WhatsApp dan alamat lengkap mitra akan terbuka otomatis saat kedua pihak telah menyepakati harga pasokan.
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
                      disabled={mutation.isPending}
                      onClick={() => void handleAccept().catch(()=>undefined)}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      {mutation.isPending
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
                        setCounterModalOpen(true);
                      }}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      {isMobile ? "Nego Harga" : "Ajukan Nego Harga Baru"}
                    </Button>

                    <Button
                      variant="ghost"
                      className="w-full min-h-9 text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => setCancelModalOpen(true)}
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

            {/* When Approved: Dual Party Physical Confirmation */}
            {contract.status === "approved" && (
              <div className="space-y-3.5">
                <div className="rounded-xl text-xs mb-6 space-y-2">
                  <div className="flex justify-between font-semibold text-foreground">
                    <span>Status Serah Terima Gabah:</span>
                    <span className="text-emerald-700 dark:text-emerald-400">
                      {hasUserConfirmed && hasPartnerConfirmed
                        ? "Lengkap (2/2)"
                        : hasUserConfirmed || hasPartnerConfirmed
                        ? "Menunggu Mitra (1/2)"
                        : "Belum Dikonfirmasi (0/2)"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Setelah gabah fisik diangkut dan pembayaran diselesaikan secara mandiri di lapangan, kedua pihak wajib menekan tombol konfirmasi.
                  </p>
                </div>
                {!hasUserConfirmed ? (
                  <Button
                    className="w-full min-h-11 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={mutation.isPending}
                    onClick={() => void handleConfirmPhysical().catch(()=>undefined)}
                  >
                    <CheckCheck className="w-4 h-4 mr-2" />
                    {mutation.isPending
                      ? "Menyimpan Konfirmasi…"
                      : isMobile
                      ? "Konfirmasi Selesai"
                      : "Konfirmasi Gabah Diterima / Transaksi Selesai"}
                  </Button>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 text-xs text-emerald-800 dark:text-emerald-200 text-center font-medium">
                    ✓ Anda telah mengonfirmasi penyelesaian fisik. Menunggu konfirmasi dari {partnerRole}.
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full min-h-10 text-xs"
                  render={
                    <Link href={`/kontrak/${contract.id}/bukti`}>
                      <FileText className="w-3.5 h-3.5 mr-2" />
                      {isMobile ? "Bukti Kesepakatan" : "Buka Surat Bukti Kesepakatan"}
                    </Link>
                  }
                />

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

            {/* When Completed */}
            {contract.status === "completed" && (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-300 text-xs text-blue-900 dark:text-blue-200 text-center space-y-1">
                  <p className="font-bold">Transaksi Tuntas</p>
                  <p className="text-xs opacity-90">
                    Kedua belah pihak telah menyelesaikan komitmen pasokan ini dengan sukses.
                  </p>
                </div>

                <Button
                  className="w-full min-h-10 text-xs font-semibold"
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
      <Dialog open={counterModalOpen} onOpenChange={setCounterModalOpen}>
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
              disabled={mutation.isPending || proposedPrice <= 0}
              onClick={() => void handleCounterSubmit().catch(()=>undefined)}
            >
              {mutation.isPending ? "Mengirim Nego…" : "Kirim Nego Harga"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Cancel / Reject Contract */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
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
              onClick={() => void handleCancelSubmit().catch(()=>undefined)}
            >
              {mutation.isPending ? "Membatalkan…" : isMobile ? "Ya, Batalkan" : "Ya, Batalkan Kesepakatan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
