import type { OfferInput } from "../schemas";

export type OfferFormProps = {
  initialValues?: OfferInput;
  isPending: boolean;
  errorMessage?: string;
  onSubmit: (values: OfferInput) => Promise<void>;
};

// Replace the placeholder with controlled inputs or React Hook Form.
// Never reset user inputs when submission fails.
export function OfferForm({ isPending, errorMessage }: OfferFormProps) {
  return (
    <section aria-busy={isPending}>
      <p>Tempat form tawaran panen.</p>
      {errorMessage && <p role="alert">{errorMessage}</p>}
    </section>
  );
}
