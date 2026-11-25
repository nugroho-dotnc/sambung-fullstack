import type { OfferInput } from "../schemas";

export const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

export function OfferSummary({ input }: { input: OfferInput }) {
  const locationText = input.district || input.districtId || "Pagaden, Subang";
  const rows = [
    { label: "Jenis Komoditas", value: `Gabah ${input.grainType} (${input.grainType === "GKP" ? "Kering Panen" : "Kering Giling"})` },
    { label: "Volume Panen Bersih", value: `${input.totalVolumeKg.toLocaleString("id-ID")} kg (${(input.totalVolumeKg / 1000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} ton)`, isMono: true },
    { label: "Kadar Air / Mutu", value: input.quality === null ? "Belum diukur (Deklarasi)" : `${input.quality}% (Deklarasi Petani)` },
    { label: "Lokasi Pengambilan", value: `${locationText}, ${input.regency || "Subang"}` },
    { label: "Estimasi Tanggal Panen", value: input.availableOn ? new Date(input.availableOn).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "Tersedia Langsung" },
    { label: "Harga Minta Petani", value: `${formatRupiah(input.askPrice)} / kg`, isMono: true },
    { label: "Estimasi Total Nilai Pasokan", value: formatRupiah(input.askPrice * input.totalVolumeKg), isHighlight: true, isMono: true },
  ];

  return (
    <dl className="divide-y divide-border/60 rounded-2xl border border-border/80 bg-muted/20 px-5 text-sm">
      {rows.map(({ label, value, isMono, isHighlight }) => (
        <div key={label} className="flex flex-wrap items-center justify-between gap-3 py-4">
          <dt className="text-muted-foreground text-xs">{label}</dt>
          <dd
            className={`font-semibold text-foreground text-right ${
              isMono ? "tabular-nums" : ""
            } ${isHighlight ? "text-base text-emerald-700 dark:text-emerald-400 font-bold" : ""}`}
          >
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
