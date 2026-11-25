import type { HarvestOffer } from "../schemas";

export type OfferCardProps = {
  offer: HarvestOffer;
  onOpen: (id: string) => void;
};

export function OfferCard({ offer, onOpen }: OfferCardProps) {
  return (
    <article>
      <h2>{offer.grainType}</h2>
      <p>{offer.availableVolumeKg} kg tersedia</p>
      <button type="button" onClick={() => onOpen(offer.id)}>Lihat tawaran</button>
    </article>
  );
}
