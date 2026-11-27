import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton fallback untuk wizard pembuatan/sunting tawaran panen (/petani/jual). */
export function OfferWizardSkeleton() {
  return (
    <div role="status" aria-busy="true" className="@container space-y-6 sm:space-y-8">
      <span className="sr-only">Memuat formulir penawaran...</span>

      {/* Header & tombol kembali */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-36 rounded-md" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-8 w-64 max-w-full rounded-lg sm:w-80" />
            <Skeleton className="h-4 w-72 max-w-full rounded-md sm:w-96" />
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
      <div className="grid grid-cols-1 items-start gap-6 @3xl:grid-cols-12">
        <div className="@container min-w-0 space-y-5 rounded-2xl border border-border/80 bg-card p-4 sm:space-y-6 sm:p-7 @3xl:col-span-7">
          <div className="space-y-1.5 border-b border-border/60 pb-3">
            <Skeleton className="h-5 w-52 rounded-md" />
            <Skeleton className="h-3.5 w-72 max-w-full rounded-md" />
          </div>

          <div className="grid grid-cols-1 gap-4 @md:grid-cols-2">
            <div className="col-span-full space-y-2">
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
            <div className="col-span-full space-y-2">
              <Skeleton className="h-3.5 w-44 rounded-md" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
            <div className="col-span-full space-y-2">
              <Skeleton className="h-3.5 w-48 rounded-md" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-5 rounded-2xl border border-border/80 bg-card p-4 sm:p-6 @3xl:col-span-5">
          <div className="space-y-1.5 border-b border-border/60 pb-3">
            <Skeleton className="h-5 w-44 rounded-md" />
            <Skeleton className="h-3.5 w-60 max-w-full rounded-md" />
          </div>
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
