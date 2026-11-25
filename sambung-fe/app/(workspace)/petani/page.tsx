"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, ArrowRight, Info, Clock, CheckCircle2 } from "lucide-react";
import { useCurrentUser } from "@/features/auth/hooks/use-auth";
import { useOffers } from "@/features/offers/hooks/use-offers";
import { useContracts } from "@/features/contracts/hooks/use-contracts";
import { PriceReferenceService } from "@/features/price-check";

export default function FarmerDashboardPage() {
  const { data: user } = useCurrentUser();
  const { data: offers = [] } = useOffers();
  const { data: contracts = [] } = useContracts();

  const priceRef = PriceReferenceService.getReference("GKP", user?.regency || "Subang");

  const metrics = useMemo(() => {
    const totalVolume = offers.reduce((acc, curr) => acc + curr.totalVolumeKg, 0);
    const availableVolume = offers.reduce((acc, curr) => acc + curr.availableVolumeKg, 0);
    const reservedVolume = offers.reduce((acc, curr) => acc + curr.reservedVolumeKg, 0);
    const pendingMyTurn = contracts.filter(
      (c) => c.status === "pending" && c.currentTurnRole === "petani"
    ).length;

    return {
      totalVolume,
      availableVolume,
      reservedVolume,
      pendingMyTurn,
    };
  }, [offers, contracts]);

  return (
    <PageContainer>
      <PageHeader
        title="Beranda Petani"
        description={`Selamat datang kembali, ${user?.name || "Bapak/Ibu Petani"}. Pantau acuan harga wajar gabah di wilayah Anda dan kelola penawaran hasil panen dengan mudah.`}
        actions={
          <Button className="min-h-11 font-semibold cursor-pointer" render={<Link href="/petani/jual" />}>
            <PlusCircle className="w-4 h-4 mr-2" />
            Jual Hasil Panen Baru
          </Button>
        }
      />

      {/* Grid Ringkasan Lumbung Petani */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-border/80 shadow-xs">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Tawaran Panen Aktif</span>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs">
                {offers.filter((o) => o.status === "published").length} Terbit di Pasar
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl sm:text-3xl font-extrabold font-display text-foreground tabular-nums">
              {metrics.totalVolume.toLocaleString("id-ID")}{" "}
              <span className="text-base font-normal text-muted-foreground font-sans">kg</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 tabular-nums">
              <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 font-sans" />
              Tersedia {metrics.availableVolume.toLocaleString("id-ID")} kg · Tertahan {metrics.reservedVolume.toLocaleString("id-ID")} kg
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
              Berdasarkan pantauan pasar berkala setempat
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 shadow-xs">
          <CardHeader className="p-5 pb-2">
            <span className="text-xs font-semibold text-muted-foreground">Pesanan Perlu Respons</span>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl sm:text-3xl font-extrabold font-display text-foreground tabular-nums">
              {metrics.pendingMyTurn}{" "}
              <span className="text-base font-normal text-muted-foreground font-sans">pesanan</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.pendingMyTurn > 0
                ? "Ada negosiasi harga menunggu tanggapan Anda"
                : "Tidak ada negosiasi perlu respons saat ini"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Card Aksi Cepat / Pengenalan Jual Panen */}
      <Card className="rounded-2xl border-border/80 bg-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-bold text-base text-foreground">Siap Menawarkan Gabah Hasil Panen Musim Ini?</h3>
            <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
              Daftarkan tonase gabah Anda ke pasar digital SAMBUNG. Gunakan bilah pengukur spektrum harga wajar untuk memastikan harga jual Anda aman dan menguntungkan.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button variant="outline" className="min-h-11 cursor-pointer" render={<Link href="/petani/tawaran" />}>
              Lihat Tawaran Saya
            </Button>
            <Button className="min-h-11 font-semibold cursor-pointer" render={<Link href="/petani/jual" />}>
              Mulai Jual Panen
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </Card>
    </PageContainer>
  );
}
