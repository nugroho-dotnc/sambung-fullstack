ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "farmerSignature" TEXT;
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "farmerSignatureType" TEXT;
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "farmerSignedAt" TIMESTAMPTZ(6);
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "buyerSignature" TEXT;
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "buyerSignatureType" TEXT;
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "buyerSignedAt" TIMESTAMPTZ(6);
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "shippedAt" TIMESTAMPTZ(6);
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMPTZ(6);

ALTER TABLE "Contract" DROP CONSTRAINT IF EXISTS "Contract_status_check";
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_status_check" CHECK (status IN ('pending', 'approved', 'signed', 'shipping', 'completed', 'cancelled', 'expired', 'rejected'));
