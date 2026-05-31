-- CreateTable
CREATE TABLE "pending_checkouts" (
    "id" UUID NOT NULL,
    "nuqood_ref" TEXT NOT NULL,
    "bank_number" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "bank_account" TEXT NOT NULL,
    "amount_kobo" BIGINT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "items" JSONB NOT NULL,
    "contact" JSONB NOT NULL,
    "shipping" JSONB NOT NULL,
    "coupon_code" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "order_id" UUID,
    "order_number" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "pending_checkouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pending_checkouts_nuqood_ref_key" ON "pending_checkouts"("nuqood_ref");

-- CreateIndex
CREATE INDEX "pending_checkouts_nuqood_ref_idx" ON "pending_checkouts"("nuqood_ref");

-- CreateIndex
CREATE INDEX "pending_checkouts_bank_number_idx" ON "pending_checkouts"("bank_number");

-- CreateIndex
CREATE INDEX "pending_checkouts_expires_at_idx" ON "pending_checkouts"("expires_at");
