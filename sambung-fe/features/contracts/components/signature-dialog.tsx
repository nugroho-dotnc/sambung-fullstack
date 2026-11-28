"use client";

import { useState, useRef, useEffect } from "react";
import { PenTool, Type, RotateCcw, CheckCircle2 } from "lucide-react";
import { useTheme } from "@/providers/theme-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface Point {
  x: number;
  y: number;
}

function redrawStrokes(
  canvas: HTMLCanvasElement,
  strokes: Point[][],
  strokeColor: string,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = strokeColor;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const stroke of strokes) {
    if (stroke.length === 0) continue;
    if (stroke.length === 1) {
      ctx.beginPath();
      ctx.arc(stroke[0].x, stroke[0].y, 1.25, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(stroke[0].x, stroke[0].y);
    for (let i = 1; i < stroke.length; i++) {
      ctx.lineTo(stroke[i].x, stroke[i].y);
    }
    ctx.stroke();
  }
}

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
  const { resolvedTheme } = useTheme();
  const displayInk = resolvedTheme === "dark" ? "#f8fafc" : "#0f172a";

  const [activeTab, setActiveTab] = useState<"draw" | "type">("draw");
  const [typedName, setTypedName] = useState<string | null>(null);
  const effectiveTypedName = typedName ?? signerName;
  const [hasDrawn, setHasDrawn] = useState(false);
  const [agreed, setAgreed] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const strokesRef = useRef<Point[][]>([]);

  // Initialize and redraw canvas whenever dialog opens, switches to draw tab, or theme changes
  useEffect(() => {
    if (open && activeTab === "draw") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      redrawStrokes(canvas, strokesRef.current, displayInk);
    }
  }, [open, activeTab, displayInk]);

  function getCanvasCoords(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): Point {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
    const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  function startDrawing(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const point = getCanvasCoords(e);
    strokesRef.current.push([point]);

    ctx.strokeStyle = displayInk;
    ctx.fillStyle = displayInk;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.arc(point.x, point.y, 1.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);

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
    const point = getCanvasCoords(e);
    const activeStroke = strokesRef.current[strokesRef.current.length - 1];
    if (activeStroke) {
      activeStroke.push(point);
    }
    ctx.strokeStyle = displayInk;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }

  function stopDrawing() {
    isDrawingRef.current = false;
  }

  function clearCanvas() {
    strokesRef.current = [];
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setHasDrawn(false);
  }

  function handleDialogOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      strokesRef.current = [];
      isDrawingRef.current = false;
      setHasDrawn(false);
      setError(null);
    }
    onOpenChange(nextOpen);
  }

  async function handleSubmit() {
    setError(null);
    if (!agreed) {
      setError("Harap centang persetujuan keabsahan tanda tangan.");
      return;
    }

    try {
      if (activeTab === "draw") {
        if (!hasDrawn || !canvasRef.current || strokesRef.current.length === 0) {
          setError("Silakan buat goresan tanda tangan Anda pada bidang kanvas.");
          return;
        }
        const exportCanvas = document.createElement("canvas");
        exportCanvas.width = canvasRef.current.width;
        exportCanvas.height = canvasRef.current.height;
        redrawStrokes(exportCanvas, strokesRef.current, "#09090b");
        const dataUrl = exportCanvas.toDataURL("image/png");
        await onConfirm({ type: "draw", signature: dataUrl });
      } else {
        const trimmed = effectiveTypedName.trim();
        if (trimmed.length < 2) {
          setError("Silakan ketikkan nama Anda minimal 2 karakter.");
          return;
        }
        await onConfirm({ type: "type", signature: trimmed });
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal menyimpan tanda tangan kontrak."
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
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
                value={effectiveTypedName}
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
              <div className="min-h-14 flex items-center justify-center">
                <span className="font-signature text-3xl sm:text-4xl text-foreground tracking-wide select-none">
                  {effectiveTypedName || "Nama Anda"}
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
            onClick={() => handleDialogOpenChange(false)}
          >
            Batal
          </Button>
          <Button
            type="button"
            className="min-h-10 text-xs font-semibold"
            disabled={isSubmitting || (activeTab === "draw" ? !hasDrawn : !effectiveTypedName.trim())}
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
