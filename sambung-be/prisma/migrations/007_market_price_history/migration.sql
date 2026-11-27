-- Create market_price_history table for weekly PIHPS BI history + AI predictions
CREATE TABLE IF NOT EXISTS "market_price_history" (
    "id" UUID NOT NULL,
    "region" TEXT NOT NULL,
    "commodity" TEXT NOT NULL DEFAULT 'Beras Medium I',
    "week_start" DATE NOT NULL,
    "farmer_price" INTEGER,
    "miller_price" INTEGER,
    "wholesale_price" INTEGER,
    "retail_price" INTEGER,
    "modern_price" INTEGER,
    "predicted_farmer_price" INTEGER,
    "predicted_miller_price" INTEGER,
    "predicted_gkp_price" INTEGER,
    "prediction_lower_80" INTEGER,
    "prediction_upper_80" INTEGER,
    "prediction_horizon_weeks" INTEGER,
    "prediction_method" TEXT,
    "prediction_model_version" TEXT,
    "predicted_at" TIMESTAMPTZ(6),
    "source" TEXT NOT NULL DEFAULT 'pihps_bi',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "market_price_history_pkey" PRIMARY KEY ("id")
);

-- Integrity constraints
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'market_price_history_source_check') THEN
        ALTER TABLE "market_price_history"
            ADD CONSTRAINT "market_price_history_source_check"
            CHECK ("source" IN ('pihps_bi', 'admin_ingest', 'ai_forecast'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'market_price_history_horizon_check') THEN
        ALTER TABLE "market_price_history"
            ADD CONSTRAINT "market_price_history_horizon_check"
            CHECK ("prediction_horizon_weeks" IS NULL OR "prediction_horizon_weeks" IN (2, 4));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'market_price_history_prices_positive_check') THEN
        ALTER TABLE "market_price_history"
            ADD CONSTRAINT "market_price_history_prices_positive_check"
            CHECK (
                ("farmer_price" IS NULL OR "farmer_price" > 0)
                AND ("miller_price" IS NULL OR "miller_price" > 0)
                AND ("wholesale_price" IS NULL OR "wholesale_price" > 0)
                AND ("retail_price" IS NULL OR "retail_price" > 0)
                AND ("modern_price" IS NULL OR "modern_price" > 0)
                AND ("predicted_farmer_price" IS NULL OR "predicted_farmer_price" > 0)
                AND ("predicted_miller_price" IS NULL OR "predicted_miller_price" > 0)
                AND ("predicted_gkp_price" IS NULL OR "predicted_gkp_price" > 0)
                AND ("prediction_lower_80" IS NULL OR "prediction_lower_80" > 0)
                AND ("prediction_upper_80" IS NULL OR "prediction_upper_80" > 0)
            );
    END IF;
END $$;

-- Unique & lookup indexes
CREATE UNIQUE INDEX IF NOT EXISTS "market_price_history_region_commodity_week_start_key"
    ON "market_price_history"("region", "commodity", "week_start");
CREATE INDEX IF NOT EXISTS "market_price_history_region_week_start_idx"
    ON "market_price_history"("region", "week_start" DESC);
