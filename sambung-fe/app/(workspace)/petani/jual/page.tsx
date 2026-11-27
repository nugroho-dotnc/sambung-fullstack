import { Suspense } from "react";
import { PageContainer } from "@/components/shared/page-container";
import { OfferWizard } from "@/features/offers/components/offer-wizard";
import { OfferWizardSkeleton } from "@/features/offers/components/offer-wizard-skeleton";

export default function FarmerSellPage() {
  return (
    <PageContainer>
      <Suspense fallback={<OfferWizardSkeleton />}>
        <OfferWizard />
      </Suspense>
    </PageContainer>
  );
}
