/*
  Warnings:

  - You are about to drop the column `backupEasypaisaWalletId` on the `Merchant` table. All the data in the column will be lost.
  - You are about to drop the column `backupJazzCashWalletId` on the `Merchant` table. All the data in the column will be lost.
  - You are about to drop the column `transactionLimit` on the `Merchant` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Merchant" DROP CONSTRAINT "Merchant_backupEasypaisaWalletId_fkey";

-- DropForeignKey
ALTER TABLE "Merchant" DROP CONSTRAINT "Merchant_backupJazzCashWalletId_fkey";

-- AlterTable
ALTER TABLE "Merchant" DROP COLUMN "backupEasypaisaWalletId",
DROP COLUMN "backupJazzCashWalletId",
DROP COLUMN "transactionLimit",
ADD COLUMN     "easypaisaLimit" DECIMAL(65,30) DEFAULT 0,
ADD COLUMN     "swichLimit" DECIMAL(65,30) DEFAULT 0;
