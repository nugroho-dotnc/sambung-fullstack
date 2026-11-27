"use client";

import { AlertOctagon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMobile } from "@/hooks/use-mobile";

interface ConfirmRedLightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  price: number;
  lowerBound: number;
  upperBound: number;
  redThreshold: number;
  onConfirm: () => void;
}

export function ConfirmRedLightDialog({
  open,
  onOpenChange,
  price,
  lowerBound,
  upperBound,
  redThreshold,
  onConfirm,
}: ConfirmRedLightDialogProps) {
  const isMobile = useMobile();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400 flex items-center justify-center mb-2">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            Konfirmasi Penetapan Harga Di Bawah Acuan
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
            Harga yang Anda tetapkan (
            <strong className="text-foreground ">
              Rp{price.toLocaleString("id-ID")}/kg
            </strong>
            ) berada di bawah batas aman toleransi pasar setempat (
            <strong className="text-foreground ">
              Rp{redThreshold.toLocaleString("id-ID")}/kg
            </strong>
            ), sedangkan rentang acuan wajar adalah{" "}
            <span className="tabular-nums text-primary font-semibold">
              Rp{lowerBound.toLocaleString("id-ID")} – Rp{upperBound.toLocaleString("id-ID")}/kg
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-red-200 bg-red-50/70 p-3.5 text-xs text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200 space-y-1.5">
          <p className="font-semibold">Perhatian Penting:</p>
          <p className="leading-relaxed opacity-90">
            Menjual gabah jauh di bawah harga pasar dapat merugikan hasil panen Anda atau kelompok tani Anda. Pastikan ada alasan khusus (misal: kadar air tinggi atau butuh penjualan segera) sebelum melanjutkan.
          </p>
        </div>

        <DialogFooter className="mt-4 gap-2 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto min-h-10"
            onClick={() => onOpenChange(false)}
          >
            {isMobile ? "Ubah Harga" : "Sesuaikan Ulang Harga"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="w-full sm:w-auto min-h-10"
            onClick={() => {
              onOpenChange(false);
              onConfirm();
            }}
          >
            {isMobile ? "Tetap Lanjutkan" : "Tetap Lanjutkan Tawaran"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
