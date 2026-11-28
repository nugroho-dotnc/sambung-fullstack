"use client";

import { use } from "react";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/shared/page-container";
import { DetailSplitSkeleton } from "@/components/shared/page-skeletons";
import { Button, ButtonLink } from "@/components/ui/button";
import { ApiError } from "@/lib/api/errors";
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

  if (isError && !(error instanceof ApiError && (error.status === 404 || error.status === 403))) {
    return (
      <PageContainer>
        <div role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/10 p-10 text-center space-y-3">
          <h2 className="text-lg font-bold text-foreground">Gagal Memuat Rincian Pasokan</h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {error?.message || "Terjadi gangguan jaringan atau server saat memuat pasokan."}
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button type="button" onClick={() => void refetch()} className="min-h-10 text-xs">
              Coba Muat Ulang
            </Button>
            <ButtonLink href="/pembeli/katalog" variant="outline" className="min-h-10 text-xs">
              Kembali ke Katalog
            </ButtonLink>
          </div>
        </div>
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
