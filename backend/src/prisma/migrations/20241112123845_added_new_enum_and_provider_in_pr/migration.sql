-- AlterEnum
ALTER TYPE "TransactionStatus" ADD VALUE 'paid';

-- AlterTable
ALTER TABLE "PaymentRequest" ADD COLUMN     "provider" TEXT;
