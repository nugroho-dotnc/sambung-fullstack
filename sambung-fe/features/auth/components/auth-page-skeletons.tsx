import { Skeleton } from "@/components/ui/skeleton";

function AuthHeaderSkeleton({
  centered = true,
  titleWidth = "w-56",
  subtitleExtraLine = false,
}: {
  centered?: boolean;
  titleWidth?: string;
  subtitleExtraLine?: boolean;
}) {
  return (
    <div className={centered ? "space-y-2.5 text-center" : "space-y-2.5"}>
      <Skeleton className={`h-8 ${titleWidth} rounded-lg ${centered ? "mx-auto" : ""}`} />
      <div className="space-y-1.5">
        <Skeleton className={`h-4 w-full max-w-xs rounded-md ${centered ? "mx-auto" : ""}`} />
        <Skeleton className={`h-4 w-48 rounded-md ${centered ? "mx-auto" : ""}`} />
        {subtitleExtraLine && (
          <Skeleton className={`h-5 w-36 rounded-md mt-1 ${centered ? "mx-auto" : ""}`} />
        )}
      </div>
    </div>
  );
}

function FieldSkeleton({
  labelWidth = "w-28",
  inputHeight = "h-11",
  rounded = "rounded-xl",
}: {
  labelWidth?: string;
  inputHeight?: string;
  rounded?: string;
}) {
  return (
    <div className="space-y-2">
      <Skeleton className={`h-4 ${labelWidth} rounded-md`} />
      <Skeleton className={`${inputHeight} w-full ${rounded}`} />
    </div>
  );
}

type AuthSkeletonProps = {
  label?: string;
};

/** Skeleton fallback untuk halaman masuk Petani/Pembeli (/masuk). */
export function LoginPageSkeleton({ label = "Memuat halaman masuk..." }: AuthSkeletonProps) {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-6 w-full">
      <span className="sr-only">{label}</span>
      <AuthHeaderSkeleton titleWidth="w-56" />

      <div className="space-y-4">
        <FieldSkeleton labelWidth="w-28" />
        <div className="flex flex-col gap-4 pt-1">
          <Skeleton className="h-11 w-full rounded-xl" />
          <div className="flex justify-end pt-3 border-t border-border/60">
            <Skeleton className="h-3.5 w-36 rounded-md" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-4 space-y-3">
        <Skeleton className="h-3.5 w-60 rounded-md" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
        <Skeleton className="h-3 w-3/4 rounded-md" />
      </div>
    </div>
  );
}

/** Skeleton fallback untuk halaman verifikasi OTP (/masuk/verifikasi). */
export function VerificationPageSkeleton({ label = "Memuat halaman verifikasi..." }: AuthSkeletonProps) {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-6 w-full">
      <span className="sr-only">{label}</span>
      <AuthHeaderSkeleton titleWidth="w-48" subtitleExtraLine />

      <div className="space-y-5">
        <div className="space-y-3">
          <FieldSkeleton labelWidth="w-24" inputHeight="h-12" />
          <div className="flex items-center justify-between pt-1">
            <Skeleton className="h-3.5 w-44 rounded-md" />
            <Skeleton className="h-3.5 w-28 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>

      <Skeleton className="h-20 w-full rounded-xl" />
    </div>
  );
}

/** Skeleton fallback untuk halaman pendaftaran profil (/daftar). */
export function RegisterPageSkeleton({ label = "Memuat formulir pendaftaran..." }: AuthSkeletonProps) {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-6 w-full">
      <span className="sr-only">{label}</span>
      <AuthHeaderSkeleton titleWidth="w-60" />

      <div className="space-y-6">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-36 rounded-md" />
            <Skeleton className="h-3.5 w-full rounded-md" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <FieldSkeleton labelWidth="w-48" rounded="rounded-md" />
          <FieldSkeleton labelWidth="w-56" rounded="rounded-md" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            <FieldSkeleton labelWidth="w-16" rounded="rounded-md" />
            <FieldSkeleton labelWidth="w-28" rounded="rounded-md" />
            <FieldSkeleton labelWidth="w-20" rounded="rounded-md" />
          </div>
        </div>

        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
    </div>
  );
}

/** Skeleton fallback untuk halaman masuk pengawas (/admin/masuk). */
export function AdminLoginPageSkeleton({ label = "Memuat halaman pengawas..." }: AuthSkeletonProps) {
  return (
    <div role="status" aria-busy="true" className="w-full space-y-8">
      <span className="sr-only">{label}</span>
      <AuthHeaderSkeleton centered={false} titleWidth="w-64" />

      <div className="space-y-5">
        <FieldSkeleton labelWidth="w-32" rounded="rounded-md" />
        <FieldSkeleton labelWidth="w-36" rounded="rounded-md" />

        <div className="flex flex-col gap-5 pt-2">
          <Skeleton className="h-11 w-full rounded-md" />
          <div className="flex justify-end pt-4 border-t border-border/60">
            <Skeleton className="h-3.5 w-44 rounded-md" />
          </div>
        </div>

        <div className="pt-3">
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
