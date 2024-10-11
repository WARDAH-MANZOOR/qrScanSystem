/*
  Warnings:

  - A unique constraint covering the columns `[transactionId]` on the table `ScheduledTask` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[additionalInfoId]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.
  - Made the column `transactionId` on table `ScheduledTask` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ScheduledTask" ALTER COLUMN "transactionId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledTask_transactionId_key" ON "ScheduledTask"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_additionalInfoId_key" ON "Transaction"("additionalInfoId");

-- AddForeignKey
ALTER TABLE "ScheduledTask" ADD CONSTRAINT "ScheduledTask_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("transaction_id") ON DELETE RESTRICT ON UPDATE CASCADE;
