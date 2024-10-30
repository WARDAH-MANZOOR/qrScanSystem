/*
  Warnings:

  - You are about to drop the column `order_id` on the `Disbursement` table. All the data in the column will be lost.
  - You are about to drop the column `order_id` on the `Transaction` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Transaction_order_id_key";

-- AlterTable
ALTER TABLE "Disbursement" DROP COLUMN "order_id";

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "order_id";
