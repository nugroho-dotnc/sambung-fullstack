-- Add payment deadline tracking columns to Contract
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "payment_due_at" TIMESTAMPTZ(6);
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "payment_grace_ends_at" TIMESTAMPTZ(6);
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "payment_reminder_sent_at" TIMESTAMPTZ(6);

-- Create contract_payment table
CREATE TABLE IF NOT EXISTS "contract_payment" (
    "id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "attempt" INTEGER NOT NULL,
    "order_id" TEXT NOT NULL,
    "contract_amount" BIGINT NOT NULL,
    "buyer_fee_amount" BIGINT NOT NULL DEFAULT 0,
    "gross_amount" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "provider" TEXT NOT NULL DEFAULT 'midtrans_sandbox',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "escrow_status" TEXT NOT NULL DEFAULT 'unpaid',
    "payment_type" TEXT,
    "payment_channel" TEXT,
    "payment_reference" TEXT,
    "midtrans_transaction_id" TEXT,
    "midtrans_status" TEXT,
    "fraud_status" TEXT,
    "snap_token" TEXT,
    "redirect_url" TEXT,
    "raw_notification" JSONB,
    "paid_at" TIMESTAMPTZ(6),
    "released_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),
    "last_synced_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "contract_payment_pkey" PRIMARY KEY ("id")
);

-- Integrity constraints
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contract_payment_contract_id_fkey') THEN
        ALTER TABLE "contract_payment"
            ADD CONSTRAINT "contract_payment_contract_id_fkey"
            FOREIGN KEY ("contract_id") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contract_payment_amounts_check') THEN
        ALTER TABLE "contract_payment"
            ADD CONSTRAINT "contract_payment_amounts_check"
            CHECK (
                "attempt" >= 1
                AND "contract_amount" > 0
                AND "buyer_fee_amount" >= 0
                AND "gross_amount" > 0
                AND "gross_amount" = "contract_amount" + "buyer_fee_amount"
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contract_payment_status_escrow_check') THEN
        ALTER TABLE "contract_payment"
            ADD CONSTRAINT "contract_payment_status_escrow_check"
            CHECK (
                (
                    "status" IN ('pending', 'failed', 'expired', 'cancelled')
                    AND "escrow_status" = 'unpaid'
                    AND "paid_at" IS NULL
                    AND "released_at" IS NULL
                )
                OR (
                    "status" = 'paid'
                    AND "escrow_status" = 'held'
                    AND "paid_at" IS NOT NULL
                    AND "released_at" IS NULL
                )
                OR (
                    "status" = 'paid'
                    AND "escrow_status" = 'released'
                    AND "paid_at" IS NOT NULL
                    AND "released_at" IS NOT NULL
                )
                OR (
                    "status" = 'refunded'
                    AND "escrow_status" = 'refunded'
                    AND "paid_at" IS NOT NULL
                )
            );
    END IF;
END $$;

-- Indexes including partial unique invariants
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'contract_payment_order_id_key') THEN
        CREATE UNIQUE INDEX "contract_payment_order_id_key" ON "contract_payment"("order_id");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'contract_payment_contract_id_attempt_key') THEN
        CREATE UNIQUE INDEX "contract_payment_contract_id_attempt_key" ON "contract_payment"("contract_id", "attempt");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'contract_payment_contract_id_created_at_idx') THEN
        CREATE INDEX "contract_payment_contract_id_created_at_idx" ON "contract_payment"("contract_id", "created_at" DESC);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'contract_payment_one_paid_per_contract_idx') THEN
        CREATE UNIQUE INDEX "contract_payment_one_paid_per_contract_idx" ON "contract_payment"("contract_id") WHERE "status" = 'paid';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'contract_payment_one_pending_per_contract_idx') THEN
        CREATE UNIQUE INDEX "contract_payment_one_pending_per_contract_idx" ON "contract_payment"("contract_id") WHERE "status" = 'pending';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Contract_status_payment_due_at_payment_grace_ends_at_idx') THEN
        CREATE INDEX "Contract_status_payment_due_at_payment_grace_ends_at_idx" ON "Contract"("status", "payment_due_at", "payment_grace_ends_at");
    END IF;
END $$;
