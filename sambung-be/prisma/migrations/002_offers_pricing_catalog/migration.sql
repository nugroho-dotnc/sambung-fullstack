-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "regency" TEXT NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "districtId" TEXT NOT NULL,
    "grainType" TEXT NOT NULL,
    "totalVolumeKg" DECIMAL(14,2) NOT NULL,
    "askPrice" INTEGER NOT NULL,
    "quality" DOUBLE PRECISION,
    "availableOn" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "priceCheck" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferRequest" (
    "ownerId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "response" JSONB NOT NULL,

    CONSTRAINT "OfferRequest_pkey" PRIMARY KEY ("ownerId","key")
);

-- CreateIndex
CREATE INDEX "Offer_status_updatedAt_idx" ON "Offer"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "Offer_ownerId_idx" ON "Offer"("ownerId");

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Offer" ADD CHECK ("totalVolumeKg" > 0 AND "askPrice" > 0 AND version > 0),
 ADD CHECK ("grainType" IN ('GKP','GKG') AND status IN ('draft','published','withdrawn')),
 ADD CHECK (quality BETWEEN 0 AND 100);
INSERT INTO "Region"(id,regency,province) VALUES
 ('Sumbersari','Jember','Jawa Timur'),('Pagaden','Subang','Jawa Barat'),('Ciasem','Subang','Jawa Barat'),
 ('Binong','Subang','Jawa Barat'),('Pamanukan','Subang','Jawa Barat'),('Purwadadi','Subang','Jawa Barat'),
 ('Telagasari','Karawang','Jawa Barat');
