/*
  Warnings:

  - You are about to drop the column `additionalInfoId` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Transaction` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[merchant_custom_order_id]` on the table `Disbursement` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[merchant_transaction_id]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[system_transaction_id]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.
  - Made the column `transaction_id` on table `Disbursement` required. This step will fail if there are existing NULL values in that column.
  - Made the column `uid` on table `Merchant` required. This step will fail if there are existing NULL values in that column.
  - Made the column `createdAt` on table `Transaction` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_additionalInfoId_fkey";

-- DropIndex
DROP INDEX "Transaction_additionalInfoId_key";

-- DropIndex
DROP INDEX "Transaction_transaction_id_key";

-- AlterTable
ALTER TABLE "AdditionalInfo" ADD COLUMN     "transactionTransaction_id" TEXT;

-- AlterTable
ALTER TABLE "Disbursement" ADD COLUMN     "merchant_custom_order_id" TEXT,
ALTER COLUMN "transaction_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "Merchant" ALTER COLUMN "uid" SET NOT NULL;

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "additionalInfoId",
DROP COLUMN "deletedAt",
ADD COLUMN     "merchant_transaction_id" TEXT,
ADD COLUMN     "payin_transaction_id" TEXT,
ADD COLUMN     "system_transaction_id" TEXT,
ALTER COLUMN "createdAt" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Disbursement_merchant_custom_order_id_key" ON "Disbursement"("merchant_custom_order_id");

-- CreateIndex
CREATE INDEX "Merchant_phone_number_idx" ON "Merchant"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_merchant_transaction_id_key" ON "Transaction"("merchant_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_system_transaction_id_key" ON "Transaction"("system_transaction_id");

-- CreateIndex
CREATE INDEX "Transaction_merchant_transaction_id_idx" ON "Transaction"("merchant_transaction_id");

-- AddForeignKey
ALTER TABLE "AdditionalInfo" ADD CONSTRAINT "AdditionalInfo_transactionTransaction_id_fkey" FOREIGN KEY ("transactionTransaction_id") REFERENCES "Transaction"("transaction_id") ON DELETE SET NULL ON UPDATE CASCADE;
