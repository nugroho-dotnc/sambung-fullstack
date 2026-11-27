"use client";

import { useState, useRef, useEffect } from "react";
import { PenTool, Type, RotateCcw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface SignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signerName: string;
  roleTitle: string;
  onConfirm: (data: { type: "draw" | "type"; signature: string }) => Promise<void>;
  isSubmitting?: boolean;
}

export function SignatureDialog({
  open,
  onOpenChange,
  signerName,
  roleTitle,
  onConfirm,
  isSubmitting = false,
}: SignatureDialogProps) {
  const [activeTab, setActiveTab] = useState<"draw" | "type">("draw");
  const [typedName, setTypedName] = useState(signerName || "");
  const [hasDrawn, setHasDrawn] = useState(false);
  const [agreed, setAgreed] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  // Initialize canvas when dialog opens or activeTab switches to draw
  useEffect(() => {
    if (open && activeTab === "draw") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
  }, [open, activeTab]);

  useEffect(() => {
    if (signerName && !typedName) {
      setTypedName(signerName);
    }
  }, [signerName, typedName]);

  function getCanvasCoords(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  function startDrawing(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawingRef.current = true;
    setHasDrawn(true);
    setError(null);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function stopDrawing() {
    isDrawingRef.current = false;
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }

  async function handleSubmit() {
    setError(null);
    if (!agreed) {
      setError("Harap centang persetujuan keabsahan tanda tangan.");
      return;
    }

    if (activeTab === "draw") {
      if (!hasDrawn || !canvasRef.current) {
        setError("Silakan buat goresan tanda tangan Anda pada bidang kanvas.");
        return;
      }
      const dataUrl = canvasRef.current.toDataURL("image/png");
      await onConfirm({ type: "draw", signature: dataUrl });
    } else {
      const trimmed = typedName.trim();
      if (trimmed.length < 2) {
        setError("Silakan ketikkan nama Anda minimal 2 karakter.");
        return;
      }
      await onConfirm({ type: "type", signature: trimmed });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-foreground">
            Tandatangani Surat Kesepakatan
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Tanda tangan ini akan dibubuhkan secara resmi sebagai pihak {roleTitle} pada lembar kesepakatan digital.
          </DialogDescription>
        </DialogHeader>

        {/* Tab Selector */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-muted/60 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setActiveTab("draw");
              setError(null);
            }}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "draw"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            Gores Tangan
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("type");
              setError(null);
            }}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "type"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            Ketik Nama
          </button>
        </div>

        {/* Tab Content: Draw */}
        {activeTab === "draw" && (
          <div className="space-y-2 pt-2">
            <div className="relative border-2 border-dashed border-border/80 rounded-xl bg-slate-50 dark:bg-zinc-950 overflow-hidden">
              <canvas
                ref={canvasRef}
                width={400}
                height={160}
                className="w-full h-40 touch-none cursor-crosshair bg-transparent"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              {!hasDrawn && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-muted-foreground/60 select-none">
                  Goreskan tanda tangan Anda di sini menggunakan mouse atau sentuhan
                </div>
              )}
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">
                {hasDrawn ? "Goresan tersimpan" : "Belum ada goresan"}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-7 text-xs text-muted-foreground hover:text-destructive"
                onClick={clearCanvas}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Hapus Goresan
              </Button>
            </div>
          </div>
        )}

        {/* Tab Content: Type */}
        {activeTab === "type" && (
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <label htmlFor="signatureTypedName" className="text-xs font-semibold text-foreground block">
                Ketikkan Nama Lengkap Anda
              </label>
              <input
                id="signatureTypedName"
                type="text"
                value={typedName}
                onChange={(e) => {
                  setTypedName(e.target.value);
                  setError(null);
                }}
                placeholder="Contoh: Budi Santoso"
                className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Signature Preview */}
            <div className="rounded-xl border border-border/80 bg-slate-50 dark:bg-zinc-950 p-4 text-center space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                Pratinjau Tanda Tangan
              </span>
              <div className="min-h-12 flex items-center justify-center">
                <span className="font-serif italic font-bold text-3xl text-foreground tracking-wide select-none">
                  {typedName || signerName || "Nama Anda"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Agreement Checkbox */}
        <div className="pt-2">
          <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 rounded border-input"
            />
            <span>
              Saya menyatakan bahwa data kesepakatan ini telah sesuai dan saya menyetujui komitmen transaksi ini secara sadar.
            </span>
          </label>
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive">
            {error}
          </div>
        )}

        <DialogFooter className="mt-4 gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-10 text-xs"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            Batal
          </Button>
          <Button
            type="button"
            className="min-h-10 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={isSubmitting || (activeTab === "draw" ? !hasDrawn : !typedName.trim())}
            onClick={() => void handleSubmit().catch(() => undefined)}
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            {isSubmitting ? "Menyimpan Tanda Tangan…" : "Bubuhkan Tanda Tangan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
