-- AlterTable
ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "password_hash" TEXT;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'account_email_key') THEN
        CREATE UNIQUE INDEX "account_email_key" ON "account"("email");
    END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "notification" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "link_href" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contract_id" UUID,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "system_parameter" (
    "id" TEXT NOT NULL DEFAULT 'active',
    "order_expiry_hours" INTEGER NOT NULL DEFAULT 24,
    "fair_price_tolerance_delta" DOUBLE PRECISION NOT NULL DEFAULT 0.03,
    "rendemen_gkp" DOUBLE PRECISION NOT NULL DEFAULT 0.5338,
    "rendemen_gkg" DOUBLE PRECISION NOT NULL DEFAULT 0.6274,
    "government_floor_price_gkp" INTEGER NOT NULL DEFAULT 6500,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "system_parameter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "audit_log" (
    "id" UUID NOT NULL,
    "timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_role" TEXT NOT NULL,
    "actor_name" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "details" TEXT NOT NULL,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'notification_account_id_created_at_idx') THEN
        CREATE INDEX "notification_account_id_created_at_idx" ON "notification"("account_id", "created_at");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'audit_log_timestamp_idx') THEN
        CREATE INDEX "audit_log_timestamp_idx" ON "audit_log"("timestamp" DESC);
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notification_account_id_fkey') THEN
        ALTER TABLE "notification" ADD CONSTRAINT "notification_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
