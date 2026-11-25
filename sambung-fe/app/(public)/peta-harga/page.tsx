import type { Metadata } from "next";
import FullPriceMap from "./_components/full-price-map";

export const metadata: Metadata = {
  title: "Peta & Sebaran Harga Gabah | Sambung",
  description:
    "Peta geospasial sebaran dan disparitas harga gabah 34 provinsi di Indonesia terhadap median pasar nasional.",
};

export default function PetaHargaPage() {
  return <FullPriceMap />;
}
