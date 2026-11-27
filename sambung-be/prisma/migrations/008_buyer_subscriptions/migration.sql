-- Create buyer subscription fields on account and subscription_payment table
ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "pro_expires_at" TIMESTAMPTZ(6);
ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "pro_reminder_sent_at" TIMESTAMPTZ(6);

CREATE INDEX IF NOT EXISTS "account_pro_expires_at_idx"
    ON "account"("role", "pro_expires_at");

CREATE TABLE IF NOT EXISTS "subscription_payment" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "plan_code" TEXT NOT NULL DEFAULT 'pembeli_pro_30d',
    "attempt" INTEGER NOT NULL,
    "order_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 99000,
    "duration_days" INTEGER NOT NULL DEFAULT 30,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "provider" TEXT NOT NULL DEFAULT 'midtrans_sandbox',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payment_type" TEXT,
    "payment_channel" TEXT,
    "payment_reference" TEXT,
    "midtrans_transaction_id" TEXT,
    "midtrans_status" TEXT,
    "fraud_status" TEXT,
    "snap_token" TEXT,
    "redirect_url" TEXT,
    "raw_notification" JSONB,
    "period_start" TIMESTAMPTZ(6),
    "period_end" TIMESTAMPTZ(6),
    "paid_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),
    "last_synced_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "subscription_payment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "subscription_payment_account_id_fkey"
        FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Integrity constraints
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscription_payment_status_check') THEN
        ALTER TABLE "subscription_payment"
            ADD CONSTRAINT "subscription_payment_status_check"
            CHECK ("status" IN ('pending', 'paid', 'failed', 'expired', 'cancelled', 'refunded'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscription_payment_amount_check') THEN
        ALTER TABLE "subscription_payment"
            ADD CONSTRAINT "subscription_payment_amount_check"
            CHECK ("amount" > 0 AND "duration_days" > 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscription_payment_paid_invariant') THEN
        ALTER TABLE "subscription_payment"
            ADD CONSTRAINT "subscription_payment_paid_invariant"
            CHECK (
                ("status" = 'paid' AND "paid_at" IS NOT NULL AND "period_start" IS NOT NULL AND "period_end" IS NOT NULL)
                OR ("status" <> 'paid')
            );
    END IF;
END $$;

-- Unique & lookup indexes
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_payment_order_id_key"
    ON "subscription_payment"("order_id");
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_payment_account_id_attempt_key"
    ON "subscription_payment"("account_id", "attempt");
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_payment_one_pending_per_account"
    ON "subscription_payment"("account_id")
    WHERE "status" = 'pending';
CREATE INDEX IF NOT EXISTS "subscription_payment_account_id_created_at_idx"
    ON "subscription_payment"("account_id", "created_at" DESC);
