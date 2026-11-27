import { Suspense } from "react";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { FairPriceSimulator } from "@/features/fair-price/components/fair-price-simulator";

export default function FairPricePage() {
  return (
    <PageContainer>
      <PageHeader
        title="Kalkulator & Acuan Harga Wajar Gabah"
        description="Estimasi acuan harga yang dihitung secara transparan berbasis konversi rendemen beras produsen, biaya pengolahan, dan standar mutu gabah."
      />
      <Suspense fallback={<p className="text-xs text-muted-foreground">Memuat kalkulator harga wajar...</p>}>
        <FairPriceSimulator />
      </Suspense>
    </PageContainer>
  );
}
