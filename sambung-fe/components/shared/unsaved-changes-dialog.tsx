"use client";

import { AlertTriangle, Save, LogOut } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface UnsavedChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveAndExit: () => void | Promise<void>;
  onDiscardAndExit: () => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function UnsavedChangesDialog({
  open,
  onOpenChange,
  onSaveAndExit,
  onDiscardAndExit,
  onCancel,
  isSaving = false,
}: UnsavedChangesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 flex items-center justify-center mb-1">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            Simpan Draf Sebelum Keluar?
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
            Anda memiliki perubahan data tawaran panen yang belum tersimpan. Jika Anda meninggalkan halaman ini sekarang tanpa menyimpan draf, perubahan Anda akan hilang.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSaving}
            className="w-full sm:w-auto text-xs"
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onDiscardAndExit}
            disabled={isSaving}
            className="w-full sm:w-auto text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-3.5 h-3.5 mr-1" />
            Buang Perubahan
          </Button>
          <Button
            type="button"
            onClick={() => void onSaveAndExit()}
            disabled={isSaving}
            className="w-full sm:w-auto text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Save className="w-3.5 h-3.5 mr-1" />
            {isSaving ? "Menyimpan…" : "Simpan Draf & Keluar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
