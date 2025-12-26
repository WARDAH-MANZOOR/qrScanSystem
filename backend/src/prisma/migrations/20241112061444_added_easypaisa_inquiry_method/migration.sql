-- CreateEnum
CREATE TYPE "EasypaisaInquiryMethod" AS ENUM ('DATABASE', 'WALLET');

-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "easypaisaInquiryMethod" "EasypaisaInquiryMethod" NOT NULL DEFAULT 'DATABASE';
