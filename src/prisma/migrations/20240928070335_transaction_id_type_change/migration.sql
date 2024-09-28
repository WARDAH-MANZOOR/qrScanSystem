/*
  Warnings:

  - The primary key for the `Transaction` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "ScheduledTask" ALTER COLUMN "transactionId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_pkey",
ALTER COLUMN "transaction_id" DROP DEFAULT,
ALTER COLUMN "transaction_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Transaction_pkey" PRIMARY KEY ("transaction_id");
DROP SEQUENCE "Transaction_transaction_id_seq";
