/*
  Warnings:

  - Added the required column `jazzMerchantId` to the `JazzCashMerchant` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `merchantId` on the `JazzCashMerchant` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "JazzCashMerchant" ADD COLUMN     "jazzMerchantId" TEXT NOT NULL,
DROP COLUMN "merchantId",
ADD COLUMN     "merchantId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "JazzCashMerchant" ADD CONSTRAINT "JazzCashMerchant_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
