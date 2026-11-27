"use client";

import { use } from "react";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/shared/page-container";
import { DetailSplitSkeleton } from "@/components/shared/page-skeletons";
import { ButtonLink } from "@/components/ui/button";
import { useCatalogItem } from "@/features/catalog/hooks/use-catalog";
import { PartialOrderForm } from "@/features/catalog/components/partial-order-form";

export default function BuyerSupplyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: item, isLoading, isError, error, refetch } = useCatalogItem(id);

  if (isLoading) {
    return (
      <PageContainer>
        <DetailSplitSkeleton label="Memuat rincian pasokan..." />
      </PageContainer>
    );
  }

  if (isError || !item) {
    return (
      <PageContainer>
        <div className="rounded-2xl border border-dashed p-12 text-center space-y-3">
          <h2 className="text-lg font-bold text-foreground">Pasokan Tidak Tersedia</h2>
          <p className="text-xs text-muted-foreground">
            Pasokan gabah yang Anda pilih tidak ditemukan atau telah habis dipesan oleh produsen lain.
          </p>
          <ButtonLink
            href="/pembeli/katalog"
            className="mt-3 min-h-10 text-xs"
          >
            Kembali ke Katalog
          </ButtonLink>
        </div>
      </PageContainer>
    );
  }

  return <PartialOrderForm item={item} />;
}
