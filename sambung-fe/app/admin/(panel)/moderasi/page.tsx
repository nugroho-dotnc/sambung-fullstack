"use client";

import { useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRupiah } from "@/features/offers/components/offer-summary";
import { useOffers } from "@/features/offers/hooks/use-offers";
import { useModerateOffer } from "@/features/admin/hooks/use-admin";
import {
  AlertCircle,
  CheckCircle,
  ShieldAlert,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

export default function AdminModerasiPage() {
  const { data: offers, isLoading } = useOffers();
  const moderateOfferMutation = useModerateOffer();

  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [issueNote, setIssueNote] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleApplyIssue = async (offerId: string) => {
    if (!issueNote.trim()) {
      alert("Catatan perbaikan wajib diisi.");
      return;
    }

    await moderateOfferMutation.mutateAsync({
      offerId,
      action: "request_fix",
      note: issueNote.trim(),
    });

    setSelectedOfferId(null);
    setIssueNote("");
    setSuccessMessage(`Catatan perbaikan untuk tawaran #${offerId} berhasil dikirim ke petani.`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleResolveIssue = async (offerId: string) => {
    await moderateOfferMutation.mutateAsync({
      offerId,
      action: "resolve",
    });

    setSuccessMessage(`Temuan catatan untuk tawaran #${offerId} berhasil ditutup. Status tawaran kini bersih.`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

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
          <span className="font-medium text-foreground">Moderasi Tawaran Panen</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Moderasi & Pengawasan Penawaran
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-3xl">
              Beri catatan perbaikan informasi kepada petani tanpa menyembunyikan tawaran
              atau membatalkan pesanan yang sedang bernegosiasi secara sepihak.
            </p>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 text-xs font-semibold text-amber-800 dark:text-amber-300 border border-amber-500/20 shrink-0">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Pengawasan Non-Destruktif</span>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Konten Utama Panel Moderasi */}
      <div className="space-y-4">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Memuat data tawaran...</p>
        ) : (offers || []).length === 0 ? (
          <Card className="p-8 text-center text-xs text-muted-foreground bg-card border-border/80 rounded-2xl">
            Belum ada penawaran panen yang terdaftar di sistem.
          </Card>
        ) : (
          (offers || []).map((offer) => {
            const isFlagged =
              (offer as any).moderationStatus === "Sedang diminta perbaikan";

            return (
              <Card
                key={offer.id}
                className={`border transition-all rounded-2xl overflow-hidden ${
                  isFlagged
                    ? "border-amber-400/60 bg-amber-500/5 shadow-xs"
                    : "border-border/80 bg-card shadow-xs"
                }`}
              >
                <CardContent className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="tabular-nums text-xs font-bold bg-muted/60 border border-border/80 px-2 py-0.5 rounded-md text-foreground">
                        #{offer.id}
                      </span>
                      <Badge
                        variant={isFlagged ? "destructive" : "secondary"}
                        className="text-xs font-bold"
                      >
                        {isFlagged ? "Perlu Klarifikasi" : "Status Bersih"}
                      </Badge>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground border border-border/60">
                        {offer.grainType} · {(offer.totalVolumeKg || 0).toLocaleString("id-ID")} kg
                      </span>
                      <span className="text-xs text-muted-foreground ">
                        Kec. {offer.district}, Kab. {offer.regency}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-display font-bold text-foreground text-base">
                        {offer.farmerName} ·{" "}
                        <span className="text-primary font-bold tabular-nums">
                          {formatRupiah(offer.askPrice)} /kg
                        </span>
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Kadar air panen: {offer.quality}% · Estimasi panen: {offer.availableOn}
                      </p>

                      {(offer as any).moderationIssue && (
                        <div className="text-xs text-amber-900 dark:text-amber-200 mt-2.5 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl leading-relaxed">
                          <strong className="text-amber-950 dark:text-amber-100 font-bold">
                            Catatan Temuan Pengawas:
                          </strong>{" "}
                          {(offer as any).moderationIssue}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {isFlagged ? (
                      <Button
                        size="sm"
                        disabled={moderateOfferMutation.isPending}
                        onClick={() => handleResolveIssue(offer.id)}
                        className="gap-1.5 font-bold text-xs shadow-xs cursor-pointer"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Tutup Temuan (Bersih)</span>
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedOfferId(
                            selectedOfferId === offer.id ? null : offer.id
                          );
                          setIssueNote("");
                        }}
                        className="gap-1.5 font-semibold text-amber-700 dark:text-amber-400 border-amber-400/60 hover:bg-amber-500/10 text-xs cursor-pointer"
                      >
                        <AlertCircle className="w-4 h-4" />
                        <span>Minta Perbaikan Informasi</span>
                      </Button>
                    )}
                  </div>
                </CardContent>

                {/* Form Input for Issue */}
                {selectedOfferId === offer.id && (
                  <div className="p-5 border-t border-border/80 bg-muted/20 space-y-3">
                    <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                      Tuliskan Catatan Temuan / Permintaan Perbaikan kepada Petani:
                    </label>
                    <textarea
                      rows={2}
                      value={issueNote}
                      onChange={(e) => setIssueNote(e.target.value)}
                      placeholder="Contoh: Keterangan akses jalan truk penggilingan perlu diperjelas, kadar air tampak melebihi batas toleransi..."
                      className="w-full rounded-xl border border-border/80 bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-2xs"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedOfferId(null)}
                        className="text-xs cursor-pointer"
                      >
                        Batal
                      </Button>
                      <Button
                        size="sm"
                        disabled={moderateOfferMutation.isPending}
                        onClick={() => handleApplyIssue(offer.id)}
                        className="font-bold text-xs shadow-xs cursor-pointer"
                      >
                        Kirim Catatan ke Petani
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </PageContainer>
  );
}
