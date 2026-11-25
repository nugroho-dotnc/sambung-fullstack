"use client";

import Link from "next/link";
import { SEED_PROVINCIAL_DATA } from "@/features/region-map/domain/map-types";
import { ProvincialTable } from "@/features/region-map/components/provincial-table";
import { PageContainer } from "@/components/shared/page-container";
import { Button } from "@/components/ui/button";
import { Map as MapIcon, ArrowLeft } from "lucide-react";

export default function PetaTabelPage() {
  return (
    <PageContainer>
      {/* Header & Breadcrumbs */}
      <div>
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs text-muted-foreground mb-2"
        >
          <Link href="/" className="hover:text-foreground font-semibold">
            SAMBUNG
          </Link>
          <span className="text-muted-foreground/50">/</span>
          <Link href="/peta" className="hover:text-foreground font-semibold">
            Peta Disparitas
          </Link>
          <span className="text-muted-foreground/50">/</span>
          <span className="font-medium text-foreground">Tabel Lengkap</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Tabel Disparitas Harga Provinsi
            </h1>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed max-w-3xl">
              Daftar komparasi lengkap harga gabah di seluruh provinsi di Indonesia terhadap
              median nasional beserta deviasi persentase dan jumlah titik sampel pengamatan.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs font-semibold cursor-pointer shadow-2xs"
            render={<Link href="/peta" />}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Peta Spasial</span>
          </Button>
        </div>
      </div>

      {/* Provincial Table Component */}
      <ProvincialTable data={SEED_PROVINCIAL_DATA} />
    </PageContainer>
  );
}
