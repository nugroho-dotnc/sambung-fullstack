"use client";

import { useState } from "react";
import { Truck, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatRupiah } from "@/features/offers/components/offer-summary";
import type { Contract } from "../schemas";

interface ShipConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract;
  onConfirm: (notes?: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function ShipConfirmDialog({
  open,
  onOpenChange,
  contract,
  onConfirm,
  isSubmitting = false,
}: ShipConfirmDialogProps) {
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    try {
      await onConfirm(notes.trim() || undefined);
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengonfirmasi pengiriman.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center mb-1">
            <Truck className="w-5 h-5" />
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            Konfirmasi Pengiriman Gabah
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Konfirmasi bahwa armada pengangkut telah diberangkatkan menuju lokasi pembeli.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-1 text-xs">
          {/* Summary Box */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Komoditas:</span>
              <span className="font-semibold text-foreground">Gabah {contract.grainType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Volume Kirim:</span>
              <span className="font-bold text-foreground tabular-nums">
                {contract.volumeKg.toLocaleString("id-ID")} kg
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tujuan Penerima:</span>
              <span className="font-semibold text-foreground">
                {contract.buyerBusiness || contract.buyerName}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="shipNotes" className="text-xs font-semibold text-foreground block">
              Catatan Armada / Pengemudi (Opsional)
            </label>
            <input
              id="shipNotes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Truk Colt Diesel plat B 1234 XY, Sopir Pak Wawan"
              className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 text-blue-900 dark:text-blue-300 text-[11px] leading-relaxed">
            Status pesanan akan berubah menjadi <strong>&ldquo;Gabah Sedang Dikirim&rdquo;</strong> dan mitra pembeli akan menerima pemberitahuan untuk bersiap menerima barang.
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive flex items-start gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-10 text-xs"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            Kembali
          </Button>
          <Button
            type="button"
            className="min-h-10 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
            disabled={isSubmitting}
            onClick={() => void handleSubmit().catch(() => undefined)}
          >
            <Truck className="w-4 h-4 mr-1.5" />
            {isSubmitting ? "Mengirim Konfirmasi…" : "Ya, Gabah Sudah Dikirim"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ReceiveConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract;
  onConfirm: (notes?: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function ReceiveConfirmDialog({
  open,
  onOpenChange,
  contract,
  onConfirm,
  isSubmitting = false,
}: ReceiveConfirmDialogProps) {
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const totalValue = contract.volumeKg * contract.currentPrice;

  async function handleSubmit() {
    setError(null);
    try {
      await onConfirm(notes.trim() || undefined);
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengonfirmasi penerimaan.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mb-1">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            Konfirmasi Penerimaan Gabah
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Pastikan muatan gabah telah tiba di lokasi dan kualitasnya telah diperiksa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-1 text-xs">
          {/* Summary Box */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pihak Petani:</span>
              <span className="font-semibold text-foreground">
                {contract.farmerBusiness || contract.farmerName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Volume Diterima:</span>
              <span className="font-bold text-foreground tabular-nums">
                {contract.volumeKg.toLocaleString("id-ID")} kg
              </span>
            </div>
            <div className="flex justify-between border-t border-border/60 pt-2">
              <span className="text-muted-foreground font-semibold">Total Nilai Transaksi:</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                {formatRupiah(totalValue)}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="receiveNotes" className="text-xs font-semibold text-foreground block">
              Catatan Penerimaan / Hasil Timbang (Opsional)
            </label>
            <input
              id="receiveNotes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Gabah diterima dalam kondisi baik, kadar air sesuai"
              className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 text-emerald-900 dark:text-emerald-300 text-[11px] leading-relaxed">
            Dengan mengonfirmasi, Anda menyatakan bahwa gabah telah diterima dan transaksi komitmen pasokan ini dinyatakan <strong>selesai tuntas</strong>. Lembar bukti kesepakatan akhir dapat langsung diunduh.
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive flex items-start gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-10 text-xs"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            Kembali
          </Button>
          <Button
            type="button"
            className="min-h-10 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={isSubmitting}
            onClick={() => void handleSubmit().catch(() => undefined)}
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            {isSubmitting ? "Menyelesaikan Transaksi…" : "Ya, Gabah Diterima (Selesaikan)"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
