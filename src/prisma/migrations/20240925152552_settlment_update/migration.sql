/*
  Warnings:

  - You are about to drop the column `amount` on the `Transaction` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "amount",
ADD COLUMN     "original_amount" DECIMAL(10,2),
ADD COLUMN     "settled_amount" DECIMAL(10,2);
