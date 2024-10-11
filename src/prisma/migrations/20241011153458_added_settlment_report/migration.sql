-- CreateTable
CREATE TABLE "SettlementReport" (
    "id" SERIAL NOT NULL,
    "merchant_id" INTEGER NOT NULL,
    "settlementDate" TIMESTAMP(3) NOT NULL,
    "transactionCount" INTEGER NOT NULL,
    "transactionAmount" DECIMAL(10,2) NOT NULL,
    "commission" DECIMAL(10,2) NOT NULL,
    "gst" DECIMAL(10,2) NOT NULL,
    "withholdingTax" DECIMAL(10,2) NOT NULL,
    "merchantAmount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SettlementReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SettlementReport_merchant_id_settlementDate_key" ON "SettlementReport"("merchant_id", "settlementDate");

-- CreateIndex
CREATE INDEX "MerchantFinancialTerms_merchant_id_idx" ON "MerchantFinancialTerms"("merchant_id");

-- CreateIndex
CREATE INDEX "MerchantProviderCredential_merchant_id_provider_idx" ON "MerchantProviderCredential"("merchant_id", "provider");

-- AddForeignKey
ALTER TABLE "SettlementReport" ADD CONSTRAINT "SettlementReport_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "Merchant"("merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
