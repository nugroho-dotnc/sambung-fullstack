"use client";

import { useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/shared/page-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRupiah } from "@/features/offers/components/offer-summary";
import { useOffers } from "@/features/offers/hooks/use-offers";
import { useModerateOffer } from "@/features/admin/hooks/use-admin";
import {
  AlertCircle,
  CheckCircle,
  ShieldAlert,
} from "lucide-react";

export default function AdminModerasiPage() {
  const { data: offers, isLoading } = useOffers();
  const moderateOfferMutation = useModerateOffer();

  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [issueNote, setIssueNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleApplyIssue = async (offerId: string) => {
    setFormError(null);
    if (!issueNote.trim()) {
      setFormError("Tuliskan catatan perbaikan terlebih dahulu sebelum mengirim ke petani.");
      return;
    }

    try {
      await moderateOfferMutation.mutateAsync({
        offerId,
        action: "request_fix",
        note: issueNote.trim(),
      });

      setSelectedOfferId(null);
      setIssueNote("");
      setSuccessMessage(`Catatan perbaikan untuk tawaran #${offerId} berhasil dikirim ke petani.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Gagal mengirim catatan perbaikan."
      );
    }
  };

  const handleResolveIssue = async (offerId: string) => {
    setFormError(null);
    try {
      await moderateOfferMutation.mutateAsync({
        offerId,
        action: "resolve",
      });

      setSuccessMessage(`Temuan catatan untuk tawaran #${offerId} berhasil ditutup. Status tawaran kini bersih.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Gagal menutup catatan temuan."
      );
    }
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
            Moderasi Tawaran Panen
          </span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-[28px] font-bold tracking-tight text-foreground">
              Moderasi &amp; Pengawasan Penawaran
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed max-w-3xl">
              Beri catatan perbaikan informasi kepada petani tanpa menyembunyikan tawaran
              atau membatalkan pesanan yang sedang bernegosiasi secara sepihak.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md admin-brand-pill text-xs font-semibold shrink-0 self-start sm:self-auto">
            <ShieldAlert className="w-4 h-4 shrink-0 text-white" aria-hidden="true" />
            <span>Pengawasan Non-Destruktif</span>
          </div>
        </div>
      </header>

      {successMessage && (
        <div
          role="status"
          aria-live="polite"
          className="px-4 py-3.5 rounded-lg status-success text-xs font-semibold flex items-center gap-2.5"
        >
          <CheckCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{successMessage}</span>
        </div>
      )}

      {formError && (
        <div
          role="alert"
          className="px-4 py-3.5 rounded-lg status-error text-xs font-semibold flex items-center gap-2.5"
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{formError}</span>
        </div>
      )}

      {/* Daftar Moderasi Terpadu (Gestalt Common Region) */}
      <Card className="admin-surface p-0 gap-0 overflow-hidden">
        <div className="px-6 py-5 border-b border-border flex items-center justify-between gap-3">
          <h2 className="font-display text-base font-bold text-foreground">
            Daftar Penawaran Panen Terdaftar
          </h2>
          <span className="text-xs font-semibold text-[var(--admin-gold-text)] tabular-nums">
            {(offers || []).length} tawaran
          </span>
        </div>

        {isLoading ? (
          <p className="p-10 text-center text-xs text-muted-foreground">
            Memuat data tawaran...
          </p>
        ) : (offers || []).length === 0 ? (
          <p className="p-10 text-center text-xs text-muted-foreground">
            Belum ada penawaran panen yang terdaftar di sistem.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {(offers || []).map((offer) => {
              const isFlagged = offer.moderationStatus === "Sedang diminta perbaikan";

              return (
                <div key={offer.id} className="admin-field-row">
                  <div className="p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-3 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="tabular-nums text-xs font-semibold bg-muted px-2.5 py-0.5 rounded text-foreground">
                          #{offer.id}
                        </span>
                        <Badge
                          variant="outline"
                          className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                            isFlagged ? "status-warning" : "status-success"
                          }`}
                        >
                          {isFlagged ? "Perlu Klarifikasi" : "Status Bersih"}
                        </Badge>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-muted text-foreground">
                          {offer.grainType} · {(offer.totalVolumeKg || 0).toLocaleString("id-ID")} kg
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Kec. {offer.district}, Kab. {offer.regency}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-display font-bold text-foreground text-base">
                          {offer.farmerName} ·{" "}
                          <span className="font-bold text-[var(--admin-positive-text)] tabular-nums">
                            {formatRupiah(offer.askPrice)}/kg
                          </span>
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1.5">
                          Kadar air panen: {offer.quality !== null && offer.quality !== undefined ? `${offer.quality}%` : "Belum diuji"} · Estimasi panen: {offer.availableOn || "Tersedia langsung"}
                        </p>

                        {offer.moderationIssue && (
                          <div className="text-xs status-warning mt-3 px-4 py-3 rounded-md leading-relaxed">
                            <strong className="font-bold">Catatan Temuan Pengawas:</strong>{" "}
                            {offer.moderationIssue}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                      {isFlagged ? (
                        <Button
                          size="sm"
                          disabled={moderateOfferMutation.isPending}
                          onClick={() => handleResolveIssue(offer.id)}
                          className="admin-cta min-h-9 rounded-lg px-4 gap-1.5 font-semibold text-xs cursor-pointer"
                        >
                          <CheckCircle className="w-4 h-4" aria-hidden="true" />
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
                            setFormError(null);
                          }}
                          className="min-h-9 rounded-lg px-4 gap-1.5 font-semibold text-[var(--admin-gold-text)] border-border hover:border-[#C08809] hover:bg-muted active:scale-[0.985] transition-all text-xs cursor-pointer"
                        >
                          <AlertCircle className="w-4 h-4" aria-hidden="true" />
                          <span>Minta Perbaikan Informasi</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Form Input for Issue */}
                  {selectedOfferId === offer.id && (
                    <div className="px-6 sm:px-7 py-5 border-t border-border bg-muted/40 space-y-3 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                      <label
                        htmlFor={`issue-note-${offer.id}`}
                        className="block text-xs font-semibold text-foreground"
                      >
                        Tuliskan Catatan Temuan / Permintaan Perbaikan kepada Petani
                      </label>
                      <textarea
                        id={`issue-note-${offer.id}`}
                        rows={3}
                        value={issueNote}
                        onChange={(e) => setIssueNote(e.target.value)}
                        placeholder="Contoh: Keterangan akses jalan truk penggilingan perlu diperjelas, kadar air tampak melebihi batas toleransi..."
                        className="w-full rounded-lg border border-input bg-background p-3.5 text-[13px] text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <div className="flex justify-end gap-2.5 pt-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedOfferId(null);
                            setFormError(null);
                          }}
                          className="min-h-9 rounded-lg px-4 text-xs font-semibold hover:bg-muted active:scale-95 cursor-pointer"
                        >
                          Batal
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={moderateOfferMutation.isPending}
                          onClick={() => handleApplyIssue(offer.id)}
                          className="admin-cta min-h-9 rounded-lg px-4 font-semibold text-xs cursor-pointer"
                        >
                          {moderateOfferMutation.isPending ? "Mengirim..." : "Kirim Catatan ke Petani"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </PageContainer>
  );
}
