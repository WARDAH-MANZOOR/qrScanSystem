-- CreateEnum
CREATE TYPE "public"."LimitPeriod" AS ENUM ('DAY', 'WEEK', 'MONTH');

-- CreateTable
CREATE TABLE "public"."MerchantLimitPolicy" (
    "id" SERIAL NOT NULL,
    "merchant_id" INTEGER NOT NULL,
    "provider" "public"."ProviderEnum" NOT NULL,
    "period" "public"."LimitPeriod" NOT NULL,
    "maxAmount" DECIMAL(18,2),
    "maxTxn" INTEGER,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Karachi',
    "weekStartDow" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantLimitPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MerchantLimitUsage" (
    "id" SERIAL NOT NULL,
    "merchant_id" INTEGER NOT NULL,
    "provider" "public"."ProviderEnum" NOT NULL,
    "period" "public"."LimitPeriod" NOT NULL,
    "windowStart" TIMESTAMPTZ NOT NULL,
    "windowEnd" TIMESTAMPTZ NOT NULL,
    "amountUsed" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "txnCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantLimitUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LimitReservation" (
    "id" TEXT NOT NULL,
    "merchant_id" INTEGER NOT NULL,
    "provider" "public"."ProviderEnum" NOT NULL,
    "period" "public"."LimitPeriod" NOT NULL,
    "windowStart" TIMESTAMPTZ NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "merchant_txn_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LimitReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MerchantLimitPolicy_merchant_id_provider_period_idx" ON "public"."MerchantLimitPolicy"("merchant_id", "provider", "period");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantLimitPolicy_merchant_id_provider_period_key" ON "public"."MerchantLimitPolicy"("merchant_id", "provider", "period");

-- CreateIndex
CREATE INDEX "MerchantLimitUsage_merchant_id_provider_period_idx" ON "public"."MerchantLimitUsage"("merchant_id", "provider", "period");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantLimitUsage_merchant_id_provider_period_windowStart_key" ON "public"."MerchantLimitUsage"("merchant_id", "provider", "period", "windowStart");

-- CreateIndex
CREATE INDEX "LimitReservation_merchant_id_provider_period_windowStart_idx" ON "public"."LimitReservation"("merchant_id", "provider", "period", "windowStart");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_merchant_txn_provider" ON "public"."LimitReservation"("merchant_txn_id", "provider");

-- AddForeignKey
ALTER TABLE "public"."MerchantLimitPolicy" ADD CONSTRAINT "MerchantLimitPolicy_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "public"."Merchant"("merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MerchantLimitUsage" ADD CONSTRAINT "MerchantLimitUsage_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "public"."Merchant"("merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
