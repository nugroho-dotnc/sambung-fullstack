-- CreateTable
CREATE TABLE "Contract" (
    "id" UUID NOT NULL,
    "offerId" UUID NOT NULL,
    "buyerId" UUID NOT NULL,
    "volumeKg" DECIMAL(14,2) NOT NULL,
    "farmerAskPrice" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priceOfferVersion" INTEGER NOT NULL DEFAULT 1,
    "currentPrice" INTEGER NOT NULL,
    "currentTurnRole" TEXT NOT NULL DEFAULT 'petani',
    "farmerConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "buyerConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractPrice" (
    "id" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "note" TEXT,
    "priceCheck" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Contract_offerId_status_idx" ON "Contract"("offerId", "status");

-- CreateIndex
CREATE INDEX "Contract_buyerId_idx" ON "Contract"("buyerId");

-- CreateIndex
CREATE INDEX "Contract_status_expiresAt_idx" ON "Contract"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContractPrice_contractId_version_key" ON "ContractPrice"("contractId", "version");

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractPrice" ADD CONSTRAINT "ContractPrice_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Contract" ADD CHECK ("volumeKg" > 0 AND "currentPrice" > 0),
 ADD CHECK (status IN ('pending','approved','completed','cancelled','expired','rejected')),
 ADD CHECK (status <> 'completed' OR ("farmerConfirmed" AND "buyerConfirmed"));
ALTER TABLE "ContractPrice" ADD CHECK (price > 0 AND version > 0 AND role IN ('petani','pembeli'));
