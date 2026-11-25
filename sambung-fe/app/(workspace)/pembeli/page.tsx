"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, ArrowRight, Info } from "lucide-react";
import { useCurrentUser } from "@/features/auth/hooks/use-auth";
import { useCatalog } from "@/features/catalog/hooks/use-catalog";
import { useContracts } from "@/features/contracts/hooks/use-contracts";
import { PriceReferenceService } from "@/features/price-check";

export default function BuyerDashboardPage() {
  const { data: user } = useCurrentUser();
  const { data: catalogItems = [] } = useCatalog();
  const { data: contracts = [] } = useContracts();

  const priceRef = PriceReferenceService.getReference("GKP", user?.regency || "Subang");

  const metrics = useMemo(() => {
    const totalAvailable = catalogItems.reduce((acc, curr) => acc + curr.availableVolumeKg, 0);
    const activeContracts = contracts.filter(
      (c) => c.status === "pending" || c.status === "approved"
    ).length;

    return {
      totalAvailable,
      catalogCount: catalogItems.length,
      activeContracts,
    };
  }, [catalogItems, contracts]);

  return (
    <PageContainer>
      <PageHeader
        title="Dasbor Pembeli & Penggilingan"
        description={`Selamat datang kembali, ${user?.name || "Mitra Penggilingan"}. Pantau ketersediaan pasokan gabah petani dan kelola kesepakatan pasokan Anda.`}
        actions={
          <Button className="min-h-11 font-semibold cursor-pointer" render={<Link href="/pembeli/katalog" />}>
            <ShoppingBag className="w-4 h-4 mr-2" />
            Jelajahi Pasokan Gabah
          </Button>
        }
      />

      {/* Grid Ringkasan Pasokan & Pasar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-border/80 shadow-xs">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Pasokan Terdaftar</span>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs">
                Penawaran Langsung Petani
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl sm:text-3xl font-extrabold font-display text-foreground tabular-nums">
              {metrics.totalAvailable.toLocaleString("id-ID")}{" "}
              <span className="text-base font-normal text-muted-foreground font-sans">kg</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 tabular-nums">
              <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 font-sans" />
              Tersedia dari {metrics.catalogCount} penawaran kelompok tani aktif
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 shadow-xs">
          <CardHeader className="p-5 pb-2">
            <span className="text-xs font-semibold text-muted-foreground">Acuan Wajar Subang (GKP)</span>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl sm:text-3xl font-extrabold font-display text-emerald-700 dark:text-emerald-400 tabular-nums">
              Rp{priceRef.lowerBound.toLocaleString("id-ID")}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                - Rp{priceRef.upperBound.toLocaleString("id-ID")}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Berdasarkan pantauan berkala Badan Pangan Nasional
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 shadow-xs">
          <CardHeader className="p-5 pb-2">
            <span className="text-xs font-semibold text-muted-foreground">Kesepakatan Berjalan</span>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl sm:text-3xl font-extrabold font-display text-foreground tabular-nums">
              {metrics.activeContracts}{" "}
              <span className="text-base font-normal text-muted-foreground font-sans">pesanan</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.activeContracts > 0
                ? "Pesanan dalam proses negosiasi atau disetujui"
                : "Tidak ada pesanan aktif saat ini"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Card Ajakan / Akses Cepat */}
      <Card className="rounded-2xl border-primary/20 bg-primary/5 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-bold text-base text-foreground">Butuh Pasokan Gabah untuk Kapasitas Giling Anda?</h3>
            <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
              Temukan tawaran gabah siap panen dari kelompok tani di wilayah Anda. Anda dapat mengajukan pesanan secara parsial dan menyepakati harga langsung secara transparan.
            </p>
          </div>
          <Button className="min-h-11 font-semibold shrink-0 cursor-pointer" render={<Link href="/pembeli/katalog" />}>
            Buka Katalog Pasokan
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </Card>
    </PageContainer>
  );
}
