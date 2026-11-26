"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Wheat,
  MapPin,
  Calendar,
  CheckCircle2,
  ShieldCheck,
  Info,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { formatRupiah } from "@/features/offers/components/offer-summary";
import { PriceRangeSlider, PriceReferenceService } from "@/features/price-check";
import { useContractCommand } from "@/features/contracts/hooks/use-contracts";
import { useMobile } from "@/hooks/use-mobile";
import type { CatalogItem } from "../schemas";

export function PartialOrderForm({ item }: { item: CatalogItem }) {
  const isMobile = useMobile();
  const router = useRouter();
  const createOrder = useContractCommand();

  const [volumeKg, setVolumeKg] = useState<string>(String(item.availableVolumeKg));
  const [proposedPrice, setProposedPrice] = useState<number>(item.askPrice);
  const [notes, setNotes] = useState<string>("");
  const [agreedTerms, setAgreedTerms] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const numVolume = Number(volumeKg.replace(",", ".")) || 0;
  const estimatedTotal = numVolume * proposedPrice;

  const saved = item.priceCheck?.reference;
  const priceRef = process.env.NEXT_PUBLIC_USE_MOCK === "true"
    ? PriceReferenceService.getReference(item.grainType, item.regency || "Subang")
    : { lowerBound: saved?.bounds.lowerOperational ?? 0, upperBound: saved?.bounds.upperOperational ?? 0, toleranceDelta: (saved?.deltaBp ?? 300)/10000 };

  function setVolumePercentage(percent: number) {
    const calculated = Math.round(item.availableVolumeKg * percent) / 100;
    setVolumeKg(String(calculated));
  }

  async function handleSubmitOrder(e: FormEvent) {
    e.preventDefault();
    setErrorMessage("");

    if (numVolume <= 0) {
      setErrorMessage("Volume pesanan harus lebih besar dari 0 kg.");
      return;
    }

    if (numVolume > item.availableVolumeKg) {
      setErrorMessage(
        `Volume pesanan tidak boleh melebihi pasokan yang tersedia (${item.availableVolumeKg.toLocaleString("id-ID")} kg).`
      );
      return;
    }

    if (proposedPrice <= 0) {
      setErrorMessage("Harga penawaran harus valid.");
      return;
    }

    if (!agreedTerms) {
      setErrorMessage("Anda wajib menyetujui pernyataan komitmen pasokan sebelum mengirimkan pesanan.");
      return;
    }

    try {
      const contract = await createOrder.mutateAsync({
        path:"/contracts",quote:{regionId:item.districtId,grainType:item.grainType,quality:item.quality,action:"order",price:proposedPrice},body:{offerId: item.id,
        volumeKg: numVolume,
        proposedPrice,
        notes: notes.trim() || undefined},
      });

      // Redirect to the contract negotiation room
      router.push(`/kontrak/${contract.id}`);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Gagal mengirimkan pesanan pasokan. Silakan periksa kembali koneksi Anda."
      );
    }
  }

  return (
    <PageContainer>
      <Link
        href="/pembeli/katalog"
        className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground transition mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
        {isMobile ? "Kembali" : "Kembali ke Katalog Pasokan"}
      </Link>

      <PageHeader
        title={`Pesan Pasokan Gabah ${item.grainType}`}
        description={`Ajukan pemesanan penuh atau sebagian (parsial) dari pasokan hasil panen ${item.farmerBusiness || item.farmerName}.`}
      />

      <form onSubmit={handleSubmitOrder} className="space-y-8 mb-8">
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Column: Harvest Info & Order Volume */}
          <div className="lg:col-span-7 space-y-6">
            {/* Supply Summary Card */}
            <Card className="rounded-2xl border-border/80 bg-card p-6 space-y-4">
              <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-3">
                <div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                    Gabah {item.grainType}
                  </span>
                  <h3 className="font-bold text-lg text-foreground mt-1.5">
                    {item.farmerBusiness || item.farmerName}
                  </h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span>
                      Kec. {item.district || item.districtId}, Kab. {item.regency || "Subang"}
                      {item.notes?.match(/^\[Lokasi:\s*([^\]]+)\]/) && ` · ${item.notes.match(/^\[Lokasi:\s*([^\]]+)\]/)?.[1].trim()}`}
                    </span>
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs text-muted-foreground block">Harga Minta Petani</span>
                  <span className="text-xl font-bold tabular-nums text-foreground">
                    {formatRupiah(item.askPrice)}{" "}
                    <span className="text-xs font-normal text-muted-foreground font-sans">/ kg</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                  <span className="text-muted-foreground text-xs block">Total Pasokan Tersedia</span>
                  <span className="text-base font-bold tabular-nums text-foreground">
                    {item.availableVolumeKg.toLocaleString("id-ID")} kg
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                  <span className="text-muted-foreground text-xs block">Kadar Air / Mutu</span>
                  <span className="text-base font-bold text-foreground">
                    {item.quality !== null && item.quality !== undefined ? `${item.quality}% (Hasil Uji)` : "Belum diuji (Standar pasar)"}
                  </span>
                </div>
              </div>
            </Card>

            {/* Step 1: Input Volume Parsial */}
            <Card className="rounded-2xl border-border/80 bg-card p-6 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  1. Tentukan Volume Pesanan (kg)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Anda dapat memesan seluruh volume atau sebagian (parsial) sesuai kapasitas penggilingan Anda.
                </p>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={volumeKg}
                    onChange={(e) => setVolumeKg(e.target.value)}
                    className="w-full h-12 rounded-xl border border-input bg-background px-4 text-base tabular-nums font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Masukkan jumlah kg..."
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                    kg
                  </span>
                </div>

                {/* Quick percentage selection chips */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {[25, 50, 75, 100].map((pct) => (
                    <Button
                      key={pct}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-8 text-xs rounded-lg"
                      onClick={() => setVolumePercentage(pct)}
                    >
                      {pct === 100
                        ? isMobile
                          ? "100%"
                          : "Seluruhnya (100%)"
                        : isMobile
                        ? `${pct}%`
                        : `${pct}% (${Math.round((item.availableVolumeKg * pct) / 100).toLocaleString("id-ID")} kg)`}
                    </Button>
                  ))}
                </div>
              </div>
            </Card>

            {/* Step 2: Price Proposal with Price Range Slider */}
            <PriceRangeSlider
              value={proposedPrice}
              min={5000}
              max={10000}
              lowerBound={priceRef.lowerBound}
              upperBound={priceRef.upperBound}
              toleranceDelta={priceRef.toleranceDelta}
              onChange={setProposedPrice}
              label={`2. Tentukan Harga Penawaran Pembeli (${item.grainType})`}
              description={`Harga minta petani adalah Rp${item.askPrice.toLocaleString("id-ID")}/kg. Anda dapat mengajukan harga yang sama atau harga nego.`}
            />

            {/* Optional Notes */}
            <Card className="rounded-2xl border-border/80 bg-card p-6 space-y-3">
              <label htmlFor="notes" className="text-sm font-semibold text-foreground block">
                Catatan Tambahan untuk Petani (Opsional)
              </label>
              <textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Jadwal pengambilan gabah diharapkan hari Selasa pagi..."
                className="w-full rounded-xl border border-input bg-background p-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </Card>
          </div>

          {/* Right Column: Order Calculation & Submit Action */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="rounded-2xl border-border/80 bg-card p-6 space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5 border-b border-border/60 pb-3">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Ringkasan Nilai Pesanan
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Volume Dipesan</span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {numVolume.toLocaleString("id-ID")} kg ({(numVolume / 1000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} ton)
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Harga Penawaran</span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {formatRupiah(proposedPrice)} / kg
                  </span>
                </div>
                <div className="pt-2 border-t border-border/60 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-foreground">Total Nilai Pesanan</span>
                  <span className="text-xl font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400">
                    {formatRupiah(estimatedTotal)}
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-muted/40 p-3.5 text-xs text-muted-foreground space-y-2 border border-border/60">
                <p className="flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <span>
                    Volume yang Anda pesan akan langsung dicadangkan dari katalog agar tidak diambil pihak lain selama proses negosiasi.
                  </span>
                </p>
                <p className="flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <span>
                    Petani memiliki waktu 24 jam untuk menanggapi (menyetujui atau mengajukan nego harga balik).
                  </span>
                </p>
              </div>

              {/* Agreement Checkbox */}
              <label className="flex items-start gap-2.5 pt-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  Saya menyatakan komitmen pembelian pasokan gabah sesuai volume dan harga di atas.
                </span>
              </label>

              {/* Error Message */}
              {errorMessage && (
                <div role="alert" className="rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full min-h-12 text-sm font-semibold justify-between"
                disabled={createOrder.isPending || !agreedTerms || numVolume <= 0}
              >
                <span>
                  {createOrder.isPending
                    ? "Mengirim Pesanan…"
                    : isMobile
                    ? "Kirim Pesanan"
                    : "Kirim Permintaan Pesanan"}
                </span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Card>
          </div>
        </div>
      </form>
    </PageContainer>
  );
}

