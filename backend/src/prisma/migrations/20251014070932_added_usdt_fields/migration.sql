-- AlterTable
ALTER TABLE "public"."MerchantFinancialTerms" ADD COLUMN     "usdtPercentage" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "usdtRate" DECIMAL(65,30) NOT NULL DEFAULT 0;
