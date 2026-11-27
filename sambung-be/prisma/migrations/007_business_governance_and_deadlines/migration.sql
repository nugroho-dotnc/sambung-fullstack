-- Add account closure metadata columns
ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "status_reason" TEXT;
ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "closed_at" TIMESTAMPTZ(6);

-- Add contract deadlines, handover records, and dispute/escrow resolution tracking
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "sign_deadline_at" TIMESTAMPTZ(6);
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "shipping_deadline_at" TIMESTAMPTZ(6);
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "shipping_reminder_sent_at" TIMESTAMPTZ(6);
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "receipt_deadline_at" TIMESTAMPTZ(6);
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "actual_volume_kg" DECIMAL(14,2);
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "actual_moisture_percent" DOUBLE PRECISION;
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "handover_notes" TEXT;
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "dispute_status" TEXT NOT NULL DEFAULT 'none';
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "dispute_reason" TEXT;
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "dispute_by_role" TEXT;
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "disputed_at" TIMESTAMPTZ(6);
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "dispute_resolution_note" TEXT;
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "dispute_resolved_at" TIMESTAMPTZ(6);
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "dispute_resolved_by" TEXT;

-- Backfill missing deadlines safely for existing rows
UPDATE "Contract"
SET "sign_deadline_at" = COALESCE("updatedAt", CURRENT_TIMESTAMP) + INTERVAL '48 hours'
WHERE "status" = 'approved' AND "sign_deadline_at" IS NULL;

UPDATE "Contract" c
SET "shipping_deadline_at" = p."paid_at" + INTERVAL '7 days'
FROM "contract_payment" p
WHERE p."contract_id" = c."id"
  AND p."status" = 'paid'
  AND c."status" = 'signed'
  AND c."shipping_deadline_at" IS NULL;

UPDATE "Contract"
SET "receipt_deadline_at" = "shippedAt" + INTERVAL '5 days'
WHERE "status" = 'shipping' AND "shippedAt" IS NOT NULL AND "receipt_deadline_at" IS NULL;

-- Integrity constraints
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Contract_dispute_status_check') THEN
        ALTER TABLE "Contract"
            ADD CONSTRAINT "Contract_dispute_status_check"
            CHECK ("dispute_status" IN ('none', 'open', 'resolved_released', 'resolved_refunded'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Contract_handover_metrics_check') THEN
        ALTER TABLE "Contract"
            ADD CONSTRAINT "Contract_handover_metrics_check"
            CHECK (
                ("actual_volume_kg" IS NULL OR "actual_volume_kg" > 0)
                AND ("actual_moisture_percent" IS NULL OR ("actual_moisture_percent" >= 5 AND "actual_moisture_percent" <= 45))
            );
    END IF;
END $$;

-- Indexes
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Contract_status_sign_deadline_at_idx') THEN
        CREATE INDEX "Contract_status_sign_deadline_at_idx" ON "Contract"("status", "sign_deadline_at");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Contract_status_shipping_deadline_at_idx') THEN
        CREATE INDEX "Contract_status_shipping_deadline_at_idx" ON "Contract"("status", "shipping_deadline_at");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Contract_status_receipt_deadline_at_idx') THEN
        CREATE INDEX "Contract_status_receipt_deadline_at_idx" ON "Contract"("status", "receipt_deadline_at");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Contract_dispute_status_idx') THEN
        CREATE INDEX "Contract_dispute_status_idx" ON "Contract"("dispute_status");
    END IF;
END $$;

-- Seed official 34 Indonesian provinces with representative regencies & districts (preserving initial 7 rows)
INSERT INTO "Region" ("id", "regency", "province") VALUES
  -- Aceh
  ('Meureudu', 'Pidie Jaya', 'Aceh'),
  ('Bandar Baru', 'Pidie Jaya', 'Aceh'),
  ('Indrapuri', 'Aceh Besar', 'Aceh'),
  -- Sumatera Utara
  ('Lubuk Pakam', 'Deli Serdang', 'Sumatera Utara'),
  ('Beringin', 'Deli Serdang', 'Sumatera Utara'),
  ('Perbaungan', 'Serdang Bedagai', 'Sumatera Utara'),
  -- Sumatera Barat
  ('Lubuk Basung', 'Agam', 'Sumatera Barat'),
  ('Tilatang Kamang', 'Agam', 'Sumatera Barat'),
  ('Kubung', 'Solok', 'Sumatera Barat'),
  -- Riau
  ('Bangkinang', 'Kampar', 'Riau'),
  ('Siak Hulu', 'Kampar', 'Riau'),
  ('Tembilahan', 'Indragiri Hilir', 'Riau'),
  -- Jambi
  ('Kayu Aro', 'Kerinci', 'Jambi'),
  ('Sitinjau Laut', 'Kerinci', 'Jambi'),
  ('Muara Sabak', 'Tanjung Jabung Timur', 'Jambi'),
  -- Sumatera Selatan
  ('Betung', 'Banyuasin', 'Sumatera Selatan'),
  ('Muara Telang', 'Banyuasin', 'Sumatera Selatan'),
  ('Belitang', 'Ogan Komering Ulu Timur', 'Sumatera Selatan'),
  -- Bengkulu
  ('Arga Makmur', 'Bengkulu Utara', 'Bengkulu'),
  ('Tais', 'Seluma', 'Bengkulu'),
  -- Lampung
  ('Seputih Raman', 'Lampung Tengah', 'Lampung'),
  ('Trimurjo', 'Lampung Tengah', 'Lampung'),
  ('Gading Rejo', 'Pringsewu', 'Lampung'),
  -- Kepulauan Bangka Belitung
  ('Sungailiat', 'Bangka', 'Kepulauan Bangka Belitung'),
  ('Toboali', 'Bangka Selatan', 'Kepulauan Bangka Belitung'),
  -- Kepulauan Riau
  ('Toapaya', 'Bintan', 'Kepulauan Riau'),
  ('Meral', 'Karimun', 'Kepulauan Riau'),
  -- DKI Jakarta
  ('Cakung', 'Jakarta Timur', 'DKI Jakarta'),
  ('Cilincing', 'Jakarta Utara', 'DKI Jakarta'),
  -- Jawa Barat
  ('Pagaden', 'Subang', 'Jawa Barat'),
  ('Ciasem', 'Subang', 'Jawa Barat'),
  ('Binong', 'Subang', 'Jawa Barat'),
  ('Pamanukan', 'Subang', 'Jawa Barat'),
  ('Purwadadi', 'Subang', 'Jawa Barat'),
  ('Telagasari', 'Karawang', 'Jawa Barat'),
  ('Rengasdengklok', 'Karawang', 'Jawa Barat'),
  ('Jatibarang', 'Indramayu', 'Jawa Barat'),
  ('Kandanghaur', 'Indramayu', 'Jawa Barat'),
  -- Jawa Tengah
  ('Purwodadi', 'Grobogan', 'Jawa Tengah'),
  ('Wirosari', 'Grobogan', 'Jawa Tengah'),
  ('Masaran', 'Sragen', 'Jawa Tengah'),
  ('Mranggen', 'Demak', 'Jawa Tengah'),
  ('Karanganyar Demak', 'Demak', 'Jawa Tengah'),
  -- DI Yogyakarta
  ('Godean', 'Sleman', 'DI Yogyakarta'),
  ('Kalasan', 'Sleman', 'DI Yogyakarta'),
  ('Imogiri', 'Bantul', 'DI Yogyakarta'),
  ('Sewon', 'Bantul', 'DI Yogyakarta'),
  -- Jawa Timur
  ('Sumbersari', 'Jember', 'Jawa Timur'),
  ('Wuluhan', 'Jember', 'Jawa Timur'),
  ('Geneng', 'Ngawi', 'Jawa Timur'),
  ('Paron', 'Ngawi', 'Jawa Timur'),
  ('Babat', 'Lamongan', 'Jawa Timur'),
  ('Sugio', 'Lamongan', 'Jawa Timur'),
  -- Banten
  ('Menes', 'Pandeglang', 'Banten'),
  ('Labuan', 'Pandeglang', 'Banten'),
  ('Ciruas', 'Serang', 'Banten'),
  ('Pontang', 'Serang', 'Banten'),
  -- Bali
  ('Penebel', 'Tabanan', 'Bali'),
  ('Kerambitan', 'Tabanan', 'Bali'),
  ('Ubud', 'Gianyar', 'Bali'),
  -- Nusa Tenggara Barat
  ('Praya', 'Lombok Tengah', 'Nusa Tenggara Barat'),
  ('Pujut', 'Lombok Tengah', 'Nusa Tenggara Barat'),
  ('Alas', 'Sumbawa', 'Nusa Tenggara Barat'),
  -- Nusa Tenggara Timur
  ('Ruteng', 'Manggarai', 'Nusa Tenggara Timur'),
  ('Kupang Timur', 'Kupang', 'Nusa Tenggara Timur'),
  -- Kalimantan Barat
  ('Pemangkat', 'Sambas', 'Kalimantan Barat'),
  ('Tebas', 'Sambas', 'Kalimantan Barat'),
  ('Sungai Kakap', 'Kubu Raya', 'Kalimantan Barat'),
  -- Kalimantan Tengah
  ('Kuala Kapuas', 'Kapuas', 'Kalimantan Tengah'),
  ('Kapuas Murung', 'Kapuas', 'Kalimantan Tengah'),
  ('Maliku', 'Pulang Pisau', 'Kalimantan Tengah'),
  -- Kalimantan Selatan
  ('Martapura', 'Banjar', 'Kalimantan Selatan'),
  ('Gambut', 'Banjar', 'Kalimantan Selatan'),
  ('Marabahan', 'Barito Kuala', 'Kalimantan Selatan'),
  -- Kalimantan Timur
  ('Tenggarong Seberang', 'Kutai Kartanegara', 'Kalimantan Timur'),
  ('Loa Kulu', 'Kutai Kartanegara', 'Kalimantan Timur'),
  ('Babulu', 'Penajam Paser Utara', 'Kalimantan Timur'),
  -- Kalimantan Utara
  ('Tanjung Selor', 'Bulungan', 'Kalimantan Utara'),
  ('Nunukan Selatan', 'Nunukan', 'Kalimantan Utara'),
  -- Sulawesi Utara
  ('Tondano Selatan', 'Minahasa', 'Sulawesi Utara'),
  ('Dumoga Barat', 'Bolaang Mongondow', 'Sulawesi Utara'),
  -- Sulawesi Tengah
  ('Parigi', 'Parigi Moutong', 'Sulawesi Tengah'),
  ('Sausu', 'Parigi Moutong', 'Sulawesi Tengah'),
  ('Sigi Biromaru', 'Sigi', 'Sulawesi Tengah'),
  -- Sulawesi Selatan
  ('Patampanua', 'Pinrang', 'Sulawesi Selatan'),
  ('Watang Sawitto', 'Pinrang', 'Sulawesi Selatan'),
  ('Tanete Riattang', 'Bone', 'Sulawesi Selatan'),
  ('Tempe', 'Wajo', 'Sulawesi Selatan'),
  -- Sulawesi Tenggara
  ('Unaaha', 'Konawe', 'Sulawesi Tenggara'),
  ('Wawotobi', 'Konawe', 'Sulawesi Tenggara'),
  ('Wundulako', 'Kolaka', 'Sulawesi Tenggara'),
  -- Gorontalo
  ('Limboto', 'Gorontalo', 'Gorontalo'),
  ('Tibawa', 'Gorontalo', 'Gorontalo'),
  ('Suwawa', 'Bone Bolango', 'Gorontalo'),
  -- Sulawesi Barat
  ('Wonomulyo', 'Polewali Mandar', 'Sulawesi Barat'),
  ('Campalagian', 'Polewali Mandar', 'Sulawesi Barat'),
  ('Kalukku', 'Mamuju', 'Sulawesi Barat'),
  -- Maluku
  ('Masohi', 'Maluku Tengah', 'Maluku'),
  ('Waeapo', 'Buru', 'Maluku'),
  -- Maluku Utara
  ('Tobelo', 'Halmahera Utara', 'Maluku Utara'),
  ('Maba', 'Halmahera Timur', 'Maluku Utara'),
  -- Papua
  ('Kurik', 'Merauke', 'Papua'),
  ('Semangga', 'Merauke', 'Papua'),
  ('Sentani', 'Jayapura', 'Papua'),
  -- Papua Barat
  ('Prafi', 'Manokwari', 'Papua Barat'),
  ('Warmare', 'Manokwari', 'Papua Barat'),
  ('Aimas', 'Sorong', 'Papua Barat')
ON CONFLICT ("id") DO NOTHING;
