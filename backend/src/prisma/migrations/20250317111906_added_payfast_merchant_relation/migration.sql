/*
  Warnings:

  - You are about to drop the `_MerchantToPayFastMerchant` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_MerchantToPayFastMerchant" DROP CONSTRAINT "_MerchantToPayFastMerchant_A_fkey";

-- DropForeignKey
ALTER TABLE "_MerchantToPayFastMerchant" DROP CONSTRAINT "_MerchantToPayFastMerchant_B_fkey";

-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "payFastMerchantId" INTEGER;

-- DropTable
DROP TABLE "_MerchantToPayFastMerchant";

-- AddForeignKey
ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_payFastMerchantId_fkey" FOREIGN KEY ("payFastMerchantId") REFERENCES "PayFastMerchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
