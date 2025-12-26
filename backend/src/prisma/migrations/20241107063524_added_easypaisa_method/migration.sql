-- CreateEnum
CREATE TYPE "EasypaisaPaymentMethodEnum" AS ENUM ('DIRECT', 'SWITCH');

-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "easypaisaPaymentMethod" "EasypaisaPaymentMethodEnum" NOT NULL DEFAULT 'DIRECT',
ADD COLUMN     "updatedAt" TIMESTAMP(3);
