"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/shared/page-container";
import { DetailSplitSkeleton } from "@/components/shared/page-skeletons";
import { Button } from "@/components/ui/button";
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
            Pasokan gabah yang Anda pilih tidak ditemukan atau telah habis dipesan oleh pembeli lain.
          </p>
          <Button
            render={<Link href="/pembeli/katalog">Kembali ke Katalog</Link>}
            className="mt-3 min-h-10 text-xs"
          />
        </div>
      </PageContainer>
    );
  }

  return <PartialOrderForm item={item} />;
}
