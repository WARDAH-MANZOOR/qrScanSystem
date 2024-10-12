-- DropForeignKey
ALTER TABLE "JazzCashMerchant" DROP CONSTRAINT "JazzCashMerchant_merchantId_fkey";

-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "jazzCashMerchantId" INTEGER;

-- AddForeignKey
ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_jazzCashMerchantId_fkey" FOREIGN KEY ("jazzCashMerchantId") REFERENCES "JazzCashMerchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
