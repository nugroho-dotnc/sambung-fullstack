import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton fallback untuk wizard pembuatan/sunting tawaran panen (/petani/jual). */
export function OfferWizardSkeleton() {
  return (
    <div role="status" aria-busy="true" className="space-y-6">
      <span className="sr-only">Memuat formulir penawaran...</span>

      {/* Header & tombol kembali */}
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

      {/* Stepper 3 tahap */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-4">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>

      {/* Grid 2 kolom form + panel ringkasan harga */}
      <div className="grid items-start gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 rounded-2xl border border-border/80 bg-card p-6 sm:p-7 space-y-6">
          <div className="space-y-1.5 border-b border-border/60 pb-3">
            <Skeleton className="h-5 w-52 rounded-md" />
            <Skeleton className="h-3.5 w-72 rounded-md" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-2">
              <Skeleton className="h-3.5 w-24 rounded-md" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-32 rounded-md" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-40 rounded-md" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Skeleton className="h-3.5 w-44 rounded-md" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Skeleton className="h-3.5 w-48 rounded-md" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 rounded-2xl border border-border/80 bg-card p-6 space-y-5">
          <div className="space-y-1.5 border-b border-border/60 pb-3">
            <Skeleton className="h-5 w-44 rounded-md" />
            <Skeleton className="h-3.5 w-60 rounded-md" />
          </div>
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
