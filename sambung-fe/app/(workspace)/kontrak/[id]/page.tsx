"use client";

import { use } from "react";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/shared/page-container";
import { DetailSplitSkeleton } from "@/components/shared/page-skeletons";
import { Button, ButtonLink } from "@/components/ui/button";
import { ApiError } from "@/lib/api/errors";
import { useContract } from "@/features/contracts/hooks/use-contracts";
import { NegotiationRoom } from "@/features/contracts/components/negotiation-room";

export default function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: contract, isLoading, isError, error, refetch } = useContract(id);

  if (isLoading) {
    return (
      <PageContainer>
        <DetailSplitSkeleton label="Memuat ruang kesepakatan..." />
      </PageContainer>
    );
  }

  if (isError && !(error instanceof ApiError && (error.status === 404 || error.status === 403))) {
    return (
      <PageContainer>
        <div role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/10 p-10 text-center space-y-3">
          <h2 className="text-lg font-bold text-foreground">Gagal Memuat Ruang Kesepakatan</h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {error?.message || "Terjadi gangguan jaringan atau server saat memuat kesepakatan."}
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button type="button" onClick={() => void refetch()} className="min-h-10 text-xs">
              Coba Muat Ulang
            </Button>
            <ButtonLink href="/kontrak" variant="outline" className="min-h-10 text-xs">
              Kembali ke Daftar Kontrak
            </ButtonLink>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (isError || !contract) {
    return (
      <PageContainer>
        <div className="rounded-2xl border border-dashed p-12 text-center space-y-3">
          <h2 className="text-lg font-bold text-foreground">Kesepakatan Tidak Ditemukan</h2>
          <p className="text-xs text-muted-foreground">
            Kesepakatan kontrak dengan ID #{id} tidak ditemukan atau Anda tidak memiliki akses ke berkas ini.
          </p>
          <ButtonLink
            href="/kontrak"
            className="mt-3 min-h-10 text-xs"
          >
            Kembali ke Daftar Kontrak
          </ButtonLink>
        </div>
      </PageContainer>
    );
  }

  return <NegotiationRoom contract={contract} />;
}
