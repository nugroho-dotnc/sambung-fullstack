import type { Metadata } from "next";
import FairPriceSection from "../_sections/fair-price";
import WorkspaceCtaSection from "../_sections/workspace-cta";

export const metadata: Metadata = {
  title: "Kalkulator Harga Wajar | Sambung",
  description:
    "Simulasi perhitungan batas bawah dan batas atas harga wajar gabah berbasis rendemen konversi giling dan kadar air panen.",
};

export default function KalkulatorPage() {
  return (
    <div className="w-full py-8 sm:py-12 space-y-12 sm:space-y-16">
      <FairPriceSection />
      <WorkspaceCtaSection />
    </div>
  );
}
