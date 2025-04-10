/*
  Warnings:

  - You are about to drop the `_JazzCashCardMerchantToMerchant` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_JazzCashCardMerchantToMerchant" DROP CONSTRAINT "_JazzCashCardMerchantToMerchant_A_fkey";

-- DropForeignKey
ALTER TABLE "_JazzCashCardMerchantToMerchant" DROP CONSTRAINT "_JazzCashCardMerchantToMerchant_B_fkey";

-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "jazzCashCardMerchantId" INTEGER;

-- DropTable
DROP TABLE "_JazzCashCardMerchantToMerchant";

-- AddForeignKey
ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_jazzCashCardMerchantId_fkey" FOREIGN KEY ("jazzCashCardMerchantId") REFERENCES "JazzCashCardMerchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
