import { Suspense } from "react";
import { PageContainer } from "@/components/shared/page-container";
import { OfferWizard } from "@/features/offers/components/offer-wizard";

export default function FarmerSellPage() {
  return (
    <PageContainer>
      <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Memuat formulir penawaran...</div>}>
        <OfferWizard />
      </Suspense>
    </PageContainer>
  );
}
