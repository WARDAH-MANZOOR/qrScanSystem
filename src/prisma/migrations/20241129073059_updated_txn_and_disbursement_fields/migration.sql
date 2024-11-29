/*
  Warnings:

  - You are about to drop the column `payin_transaction_id` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `system_transaction_id` on the `Transaction` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Transaction_system_transaction_id_key";

-- AlterTable
ALTER TABLE "Disbursement" ADD COLUMN     "system_order_id" TEXT;

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "payin_transaction_id",
DROP COLUMN "system_transaction_id";
