-- CreateTable
CREATE TABLE "site_settings" (
    "key" TEXT NOT NULL DEFAULT 'default',
    "store_name" TEXT NOT NULL DEFAULT 'Avmall',
    "store_email" TEXT NOT NULL DEFAULT 'hello@avmall.com.ng',
    "store_phone" TEXT NOT NULL DEFAULT '+234 803 421 7790',
    "store_whatsapp" TEXT NOT NULL DEFAULT '+2348034217790',
    "store_address" TEXT NOT NULL DEFAULT '14 Bourdillon Road, Ikoyi, Lagos',
    "bank_number" TEXT,
    "bank_account_name" TEXT,
    "bank_name" TEXT,
    "return_window_days" INTEGER NOT NULL DEFAULT 14,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("key")
);

-- Seed the default row so the app always has settings to read
INSERT INTO "site_settings" ("key", "updated_at") VALUES ('default', NOW()) ON CONFLICT DO NOTHING;
