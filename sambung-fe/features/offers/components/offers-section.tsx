import type { ReactNode } from "react";

export type OffersSectionProps = {
  children: ReactNode;
  actions?: ReactNode;
};

// UI composition only; fetching belongs in feature hooks.
export function OffersSection({ children, actions }: OffersSectionProps) {
  return (
    <section aria-labelledby="offers-heading">
      <h1 id="offers-heading">Tawaran Saya</h1>
      {actions}
      {children}
    </section>
  );
}
