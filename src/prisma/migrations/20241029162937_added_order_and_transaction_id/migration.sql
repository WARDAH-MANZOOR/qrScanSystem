/*
  Warnings:

  - A unique constraint covering the columns `[transaction_id]` on the table `Disbursement` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Disbursement" ADD COLUMN     "order_id" TEXT,
ADD COLUMN     "transaction_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Disbursement_transaction_id_key" ON "Disbursement"("transaction_id");
