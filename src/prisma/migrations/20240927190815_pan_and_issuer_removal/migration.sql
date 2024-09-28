/*
  Warnings:

  - You are about to drop the column `issuer_id` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the `issuer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pan_details` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_issuer_id_fkey";

-- DropForeignKey
ALTER TABLE "pan_details" DROP CONSTRAINT "pan_details_transaction_id_fkey";

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "issuer_id";

-- DropTable
DROP TABLE "issuer";

-- DropTable
DROP TABLE "pan_details";
