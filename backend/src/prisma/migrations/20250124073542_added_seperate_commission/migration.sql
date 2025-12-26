-- CreateEnum
CREATE TYPE "CommissionMode" AS ENUM ('SINGLE', 'DOUBLE');

-- AlterTable
ALTER TABLE "MerchantFinancialTerms" ADD COLUMN     "commissionMode" "CommissionMode",
ADD COLUMN     "easypaisaRate" DECIMAL(65,30);
