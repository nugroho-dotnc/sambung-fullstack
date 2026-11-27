"use client";

import { use } from "react";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/shared/page-container";
import { DetailSplitSkeleton } from "@/components/shared/page-skeletons";
import { ButtonLink } from "@/components/ui/button";
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
