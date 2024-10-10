/*
  Warnings:

  - You are about to drop the column `commission` on the `Merchant` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ProviderEnum" AS ENUM ('JAZZCASH', 'EASYPAISA');

-- AlterTable
ALTER TABLE "Merchant" DROP COLUMN "commission";

-- CreateTable
CREATE TABLE "MerchantProviderCredential" (
    "id" SERIAL NOT NULL,
    "merchant_id" INTEGER NOT NULL,
    "provider" "ProviderEnum" NOT NULL,
    "merchantOrStoreId" TEXT NOT NULL,
    "passwordOrHashKey" TEXT NOT NULL,
    "returnOrPostBackUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantProviderCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantCommission" (
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

    CONSTRAINT "MerchantCommission_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MerchantProviderCredential" ADD CONSTRAINT "MerchantProviderCredential_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "Merchant"("merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantCommission" ADD CONSTRAINT "MerchantCommission_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "Merchant"("merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
