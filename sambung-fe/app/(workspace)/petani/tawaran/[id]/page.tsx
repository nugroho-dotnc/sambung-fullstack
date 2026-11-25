import { OfferDetailView } from "@/features/offers/components/offer-detail-view";

export default async function FarmerOfferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OfferDetailView offerId={id} />;
}
