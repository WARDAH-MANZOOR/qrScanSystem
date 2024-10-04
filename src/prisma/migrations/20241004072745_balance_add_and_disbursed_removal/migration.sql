/*
  Warnings:

  - You are about to drop the column `disbursed` on the `Transaction` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "disbursed",
ADD COLUMN     "balance" DECIMAL(10,2) NOT NULL DEFAULT 0;
