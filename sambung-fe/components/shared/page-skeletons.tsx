import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton 2 kolom untuk halaman rincian/negosiasi/pesanan. */
export function DetailSplitSkeleton({ label = "Memuat rincian..." }: { label?: string }) {
  return (
    <div role="status" aria-busy="true" className="space-y-6">
      <span className="sr-only">{label}</span>
      <div className="space-y-3">
        <Skeleton className="h-4 w-36 rounded-md" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64 sm:w-80 rounded-lg" />
            <Skeleton className="h-4 w-72 sm:w-96 rounded-md" />
          </div>
          <Skeleton className="h-7 w-28 rounded-full self-start sm:self-auto" />
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl border border-border/80 bg-card p-6 space-y-4">
            <Skeleton className="h-5 w-48 rounded-md" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
          <div className="rounded-2xl border border-border/80 bg-card p-6 space-y-3">
            <Skeleton className="h-5 w-40 rounded-md" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        </div>

        <div className="lg:col-span-5 rounded-2xl border border-border/80 bg-card p-6 space-y-4">
          <Skeleton className="h-5 w-44 rounded-md" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/** Skeleton lembar bukti kesepakatan digital (/kontrak/[id]/bukti). */
export function DocumentSheetSkeleton({ label = "Menyiapkan surat kesepakatan..." }: { label?: string }) {
  return (
    <div role="status" aria-busy="true" className="space-y-6">
      <span className="sr-only">{label}</span>
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-4 w-44 rounded-md" />
        <Skeleton className="h-10 w-44 rounded-xl" />
      </div>

      <div className="rounded-2xl border border-border/80 bg-card p-8 sm:p-12 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-border/60 pb-6 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-36 rounded-md" />
            <Skeleton className="h-3.5 w-52 rounded-md" />
          </div>
          <div className="space-y-1.5 sm:text-right">
            <Skeleton className="h-3.5 w-32 rounded-md sm:ml-auto" />
            <Skeleton className="h-5 w-40 rounded-md sm:ml-auto" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>

        <Skeleton className="h-36 w-full rounded-xl" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/** Skeleton baris tabel untuk halaman daftar & panel admin. */
export function TableRowsSkeleton({
  columns,
  rows = 5,
}: {
  columns: number;
  rows?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <tr key={rowIdx} aria-hidden="true">
          {Array.from({ length: columns }).map((__, colIdx) => (
            <td key={colIdx} className="py-3.5 px-5">
              <Skeleton className={`h-4 rounded-md ${colIdx === 0 ? "w-20" : "w-full max-w-36"}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** Skeleton daftar kartu (mis. panel moderasi tawaran). */
export function ListCardsSkeleton({
  count = 3,
  label = "Memuat daftar...",
}: {
  count?: number;
  label?: string;
}) {
  return (
    <div role="status" aria-busy="true" className="space-y-4">
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-5 w-20 rounded-md" />
              <Skeleton className="h-5 w-24 rounded-md" />
              <Skeleton className="h-5 w-32 rounded-md" />
            </div>
            <Skeleton className="h-5 w-60 rounded-md" />
            <Skeleton className="h-4 w-full max-w-md rounded-md" />
          </div>
          <Skeleton className="h-10 w-36 rounded-xl shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton form pengaturan parameter sistem. */
export function SettingsFormSkeleton({ label = "Memuat pengaturan sistem..." }: { label?: string }) {
  return (
    <div role="status" aria-busy="true" className="space-y-6">
      <span className="sr-only">{label}</span>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="rounded-2xl border border-border/80 bg-card p-6 space-y-4">
            <Skeleton className="h-5 w-48 rounded-md" />
            <Skeleton className="h-3.5 w-full rounded-md" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-11 w-44 rounded-xl" />
      </div>
    </div>
  );
}

/** Skeleton daftar baris aktivitas datar (panel dashboard admin). */
export function ActivityRowsSkeleton({
  rows = 4,
  label = "Memuat aktivitas...",
}: {
  rows?: number;
  label?: string;
}) {
  return (
    <div role="status" aria-busy="true" className="divide-y divide-border/60">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-36 rounded-md" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3.5 w-full max-w-lg rounded-md" />
          </div>
          <Skeleton className="h-3.5 w-20 rounded-md shrink-0" />
        </div>
      ))}
    </div>
  );
}
