/*
  Warnings:

  - You are about to drop the column `email` on the `Merchant` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `Merchant` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Merchant_email_key";

-- AlterTable
ALTER TABLE "Merchant" DROP COLUMN "email",
DROP COLUMN "password";
