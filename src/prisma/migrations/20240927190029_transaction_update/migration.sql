/*
  Warnings:

  - The values [purchase,refund,chargeback] on the enum `TransactionType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TransactionType_new" AS ENUM ('wallet', 'card', 'bank');
ALTER TABLE "Transaction" ALTER COLUMN "type" TYPE "TransactionType_new" USING ("type"::text::"TransactionType_new");
ALTER TYPE "TransactionType" RENAME TO "TransactionType_old";
ALTER TYPE "TransactionType_new" RENAME TO "TransactionType";
DROP TYPE "TransactionType_old";
COMMIT;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "additionalInfoId" INTEGER,
ADD COLUMN     "providerId" INTEGER;

-- CreateTable
CREATE TABLE "AdditionalInfo" (
    "id" SERIAL NOT NULL,
    "bank_id" TEXT,
    "bill_reference" TEXT,
    "retrieval_ref" TEXT,
    "sub_merchant_id" TEXT,
    "settlement_expiry" TEXT,
    "custom_field_1" TEXT,
    "custom_field_2" TEXT,
    "custom_field_3" TEXT,
    "custom_field_4" TEXT,
    "custom_field_5" TEXT,

    CONSTRAINT "AdditionalInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Provider" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "txn_type" TEXT,
    "version" TEXT,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_additionalInfoId_fkey" FOREIGN KEY ("additionalInfoId") REFERENCES "AdditionalInfo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
