"use client";

import { useState, type ChangeEvent } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAdminAiIngest } from "@/features/admin/hooks/use-admin";
import type { AdminAiIngestUpdateRow } from "@/features/admin/domain/admin-types";
import {
  AlertCircle,
  CheckCircle2,
  DatabaseBackup,
  FileSpreadsheet,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";

interface IngestDraftRow {
  key: string;
  province: string;
  producerPrice: string;
  wholesalePrice: string;
  retailPrice: string;
  precip28d: string;
}

function getLatestMondayIso(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diffToMonday));
  return monday.toISOString().slice(0, 10);
}

function isValidIsoCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function makeEmptyRow(idx: number): IngestDraftRow {
  return {
    key: `row-${Date.now()}-${idx}`,
    province: "Jawa Timur",
    producerPrice: "",
    wholesalePrice: "",
    retailPrice: "",
    precip28d: "",
  };
}

function parseOptionalNumber(raw: string): number | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

export function WeeklyIngestPanel() {
  const ingestMutation = useAdminAiIngest();

  const [weekStart, setWeekStart] = useState<string>(() => getLatestMondayIso());
  const [rows, setRows] = useState<IngestDraftRow[]>([makeEmptyRow(0)]);
  const [csvText, setCsvText] = useState<string>("");
  const [showCsvBox, setShowCsvBox] = useState<boolean>(false);
  const [confirmPersist, setConfirmPersist] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  function updateRow(key: string, field: keyof IngestDraftRow, value: string) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    if (rows.length >= 50) {
      setFormError("Maksimal 50 baris pembaruan provinsi per pengiriman ingest.");
      return;
    }
    setFormError(null);
    setRows((prev) => [...prev, makeEmptyRow(prev.length)]);
  }

  function removeRow(key: string) {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function parseCsvString(text: string) {
    setFormError(null);
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setFormError("Isi CSV kosong.");
      return;
    }

    const parsedRows: IngestDraftRow[] = [];
    for (let i = 0; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim());
      // Skip header line automatically
      if (
        i === 0 &&
        cols.length >= 2 &&
        (cols[0].toLowerCase().includes("prov") || Number.isNaN(Number(cols[1])))
      ) {
        continue;
      }
      if (cols.length < 2 || !cols[0] || !cols[1]) {
        setFormError(`Baris CSV ke-${i + 1} tidak lengkap (wajib minimal province,producerPrice).`);
        return;
      }
      parsedRows.push({
        key: `csv-${Date.now()}-${i}`,
        province: cols[0],
        producerPrice: cols[1] ?? "",
        wholesalePrice: cols[2] ?? "",
        retailPrice: cols[3] ?? "",
        precip28d: cols[4] ?? "",
      });
    }

    if (parsedRows.length === 0) {
      setFormError("Tidak ada baris data provinsi yang valid di CSV.");
      return;
    }
    if (parsedRows.length > 50) {
      setFormError("Maksimal 50 baris provinsi per permintaan ingest.");
      return;
    }

    setRows(parsedRows);
    setShowCsvBox(false);
    setCsvText("");
  }

  function handleCsvFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        parseCsvString(reader.result);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function buildValidatedPayload(): {
    weekStart: string;
    updates: AdminAiIngestUpdateRow[];
  } | null {
    setFormError(null);
    const trimmedDate = weekStart.trim();
    if (!isValidIsoCalendarDate(trimmedDate)) {
      setFormError("Tanggal awal pekan (weekStart) harus berformat YYYY-MM-DD dan valid.");
      return null;
    }
    if (rows.length < 1 || rows.length > 50) {
      setFormError("Jumlah baris provinsi harus antara 1 hingga 50.");
      return null;
    }

    const updates: AdminAiIngestUpdateRow[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const prov = r.province.trim();
      if (prov.length < 2) {
        setFormError(`Baris #${i + 1}: Nama provinsi minimal 2 karakter.`);
        return null;
      }
      const producer = parseOptionalNumber(r.producerPrice);
      if (producer === undefined || Number.isNaN(producer) || producer < 7000 || producer > 35000) {
        setFormError(`Baris #${i + 1} (${prov}): Harga produsen wajib di antara Rp7.000 – Rp35.000/kg.`);
        return null;
      }

      const wholesale = parseOptionalNumber(r.wholesalePrice);
      if (wholesale !== undefined && (Number.isNaN(wholesale) || wholesale < 7000 || wholesale > 40000)) {
        setFormError(`Baris #${i + 1} (${prov}): Harga grosir opsional harus antara Rp7.000 – Rp40.000/kg.`);
        return null;
      }

      const retail = parseOptionalNumber(r.retailPrice);
      if (retail !== undefined && (Number.isNaN(retail) || retail < 7000 || retail > 45000)) {
        setFormError(`Baris #${i + 1} (${prov}): Harga eceran opsional harus antara Rp7.000 – Rp45.000/kg.`);
        return null;
      }

      const precip = parseOptionalNumber(r.precip28d);
      if (precip !== undefined && (Number.isNaN(precip) || precip < 0 || precip > 1500)) {
        setFormError(`Baris #${i + 1} (${prov}): Curah hujan 28 hari harus antara 0 – 1.500 mm.`);
        return null;
      }

      updates.push({
        province: prov,
        producerPrice: producer,
        ...(wholesale !== undefined ? { wholesalePrice: wholesale } : {}),
        ...(retail !== undefined ? { retailPrice: retail } : {}),
        ...(precip !== undefined ? { precip28d: precip } : {}),
      });
    }

    return { weekStart: trimmedDate, updates };
  }

  async function submitIngest(persist: boolean) {
    const payload = buildValidatedPayload();
    if (!payload) return;

    setConfirmPersist(false);
    try {
      await ingestMutation.mutateAsync({
        weekStart: payload.weekStart,
        updates: payload.updates,
        persist,
      });
    } catch {
      // Handled via ingestMutation.error
    }
  }

  const result = ingestMutation.data;
  const mutationErrorMessage =
    ingestMutation.error instanceof Error ? ingestMutation.error.message : null;

  return (
    <div className="space-y-6">
      <Card className="p-6 rounded-2xl border border-border/80 bg-card shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Pembaruan State Pasar AI
              </span>
              <Badge variant="outline" className="text-[11px] font-semibold">
                Jejak Audit Otomatis
              </Badge>
            </div>
            <h2 className="font-display text-lg font-bold text-foreground mt-1">
              Ingest Data Harga Mingguan ke Mesin Prakiraan
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Masukkan data harga mingguan baru per provinsi melalui formulir atau impor CSV. Gunakan <strong>Uji Kering</strong> sebelum menyimpan permanen.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowCsvBox(!showCsvBox)}
              className="gap-1.5 text-xs cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{showCsvBox ? "Tutup Paste CSV" : "Tempel CSV"}</span>
            </Button>

            <label className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-input bg-background hover:bg-muted/50 text-xs font-medium cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-primary" />
              <span>Unggah File CSV</span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvFile}
                className="sr-only"
              />
            </label>
          </div>
        </div>

        {showCsvBox && (
          <div className="p-4 rounded-xl border border-border/80 bg-muted/30 space-y-3">
            <p className="text-xs font-semibold text-foreground">
              Format CSV: <code>province,producerPrice,wholesalePrice,retailPrice,precip28d</code>
            </p>
            <Textarea
              rows={4}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={"province,producerPrice,wholesalePrice,retailPrice,precip28d\nJawa Timur,13500,14950,15250,180"}
              className="text-xs font-mono"
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => parseCsvString(csvText)}
                className="text-xs cursor-pointer"
              >
                Terapkan Baris CSV
              </Button>
            </div>
          </div>
        )}

        <div className="max-w-xs space-y-1.5">
          <label htmlFor="ingest-week-start" className="text-xs font-bold text-foreground block">
            Tanggal Awal Pekan (weekStart)
          </label>
          <Input
            id="ingest-week-start"
            type="date"
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
            className="text-xs tabular-nums"
          />
        </div>

        {/* Dynamic Province Rows */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Daftar Pembaruan Provinsi ({rows.length} / 50)
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addRow}
              className="h-7 gap-1 text-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Provinsi</span>
            </Button>
          </div>

          <div className="space-y-2.5">
            {rows.map((row, idx) => (
              <div
                key={row.key}
                className="p-3 rounded-xl border border-border/70 bg-muted/20 grid grid-cols-1 sm:grid-cols-6 gap-2.5 items-end"
              >
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-semibold text-muted-foreground block">
                    #{idx + 1} Provinsi <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="text"
                    value={row.province}
                    onChange={(e) => updateRow(row.key, "province", e.target.value)}
                    placeholder="Contoh: Jawa Timur"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground block">
                    Harga Produsen <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="number"
                    min={7000}
                    max={35000}
                    value={row.producerPrice}
                    onChange={(e) => updateRow(row.key, "producerPrice", e.target.value)}
                    placeholder="7000–35000"
                    className="h-9 text-xs tabular-nums"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground block">
                    Grosir (Opsional)
                  </label>
                  <Input
                    type="number"
                    min={7000}
                    max={40000}
                    value={row.wholesalePrice}
                    onChange={(e) => updateRow(row.key, "wholesalePrice", e.target.value)}
                    placeholder="Rp/kg"
                    className="h-9 text-xs tabular-nums"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground block">
                    Eceran / Hujan
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Input
                      type="number"
                      min={7000}
                      max={45000}
                      value={row.retailPrice}
                      onChange={(e) => updateRow(row.key, "retailPrice", e.target.value)}
                      placeholder="Eceran"
                      aria-label="Harga eceran"
                      className="h-9 text-xs tabular-nums px-2"
                    />
                    <Input
                      type="number"
                      min={0}
                      max={1500}
                      value={row.precip28d}
                      onChange={(e) => updateRow(row.key, "precip28d", e.target.value)}
                      placeholder="mm"
                      aria-label="Curah hujan 28 hari"
                      className="h-9 text-xs tabular-nums px-2"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={rows.length <= 1}
                    onClick={() => removeRow(row.key)}
                    aria-label="Hapus baris"
                    className="h-9 w-9 text-muted-foreground hover:text-destructive cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {(formError || mutationErrorMessage) && (
          <div
            role="alert"
            className="rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 text-xs text-destructive flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{formError || mutationErrorMessage}</span>
          </div>
        )}

        {confirmPersist && (
          <div className="rounded-xl border border-amber-400/70 bg-amber-50/80 dark:bg-amber-950/30 p-4 space-y-3 text-xs">
            <p className="font-bold text-amber-900 dark:text-amber-200">
              Konfirmasi Penyimpanan Permanen Data Pasar AI
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Tindakan ini akan memperbarui state pasar di layanan AI, menghitung ulang prakiraan seluruh provinsi, dan membersihkan cache harga aktif. Lanjutkan?
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => void submitIngest(true)}
                disabled={ingestMutation.isPending}
                className="text-xs font-bold cursor-pointer"
              >
                Ya, Simpan Permanen
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setConfirmPersist(false)}
                className="text-xs cursor-pointer"
              >
                Batal
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            disabled={ingestMutation.isPending}
            onClick={() => void submitIngest(false)}
            className="gap-1.5 text-xs font-semibold cursor-pointer"
          >
            {ingestMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Uji Kering (Dry-Run)</span>
          </Button>
          <Button
            type="button"
            disabled={ingestMutation.isPending}
            onClick={() => {
              if (buildValidatedPayload()) setConfirmPersist(true);
            }}
            className="gap-1.5 text-xs font-bold cursor-pointer"
          >
            <DatabaseBackup className="w-4 h-4" />
            <span>Simpan &amp; Hitung Ulang AI</span>
          </Button>
        </div>
      </Card>

      {result && (
        <Card className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              {result.persistedToDisk
                ? `Berhasil menyimpan ingest pekan ${result.weekStart} & menghitung ulang prakiraan AI.`
                : `Uji kering (dry-run) berhasil divalidasi untuk pekan ${result.weekStart} tanpa menyimpan ke disk.`}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-foreground">
            <div>
              <span className="text-muted-foreground block">Provinsi Diperbarui</span>
              <strong className="tabular-nums">{result.updatedProvincesCount} provinsi</strong>
            </div>
            <div>
              <span className="text-muted-foreground block">Unit Dihitung Ulang</span>
              <strong className="tabular-nums">{result.recomputedForecastRecords} unit</strong>
            </div>
            <div>
              <span className="text-muted-foreground block">Pekan Terbaru</span>
              <strong className="tabular-nums">{result.latestObservationWeek}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block">Status Penyimpanan</span>
              <strong>{result.persistedToDisk ? "Permanen" : "Simulasi (Dry-Run)"}</strong>
            </div>
          </div>
          {result.skippedProvinces.length > 0 && (
            <p className="text-amber-800 dark:text-amber-300 pt-1">
              Provinsi dilewati: {result.skippedProvinces.join(", ")}
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
