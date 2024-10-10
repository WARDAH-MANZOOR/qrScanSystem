/*
  Warnings:

  - You are about to drop the `MerchantCommission` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "MerchantCommission" DROP CONSTRAINT "MerchantCommission_merchant_id_fkey";

-- DropTable
DROP TABLE "MerchantCommission";

-- CreateTable
CREATE TABLE "MerchantFinancialTerms" (
    "id" SERIAL NOT NULL,
    "merchant_id" INTEGER NOT NULL,
    "commissionRate" DECIMAL(10,2) NOT NULL,
    "commissionWithHoldingTax" DECIMAL(10,2) NOT NULL,
    "commissionGST" DECIMAL(10,2) NOT NULL,
    "disbursementRate" DECIMAL(10,2) NOT NULL,
    "disbursementWithHoldingTax" DECIMAL(10,2) NOT NULL,
    "disbursementGST" DECIMAL(10,2) NOT NULL,
    "settlementDuration" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantFinancialTerms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MerchantFinancialTerms_merchant_id_key" ON "MerchantFinancialTerms"("merchant_id");

-- AddForeignKey
ALTER TABLE "MerchantFinancialTerms" ADD CONSTRAINT "MerchantFinancialTerms_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "Merchant"("merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
