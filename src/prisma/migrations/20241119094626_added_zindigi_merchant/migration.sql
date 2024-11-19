-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "zindigiMerchantId" INTEGER;

-- CreateTable
CREATE TABLE "ZindigiMerchant" (
    "id" SERIAL NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "ZindigiMerchant_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_zindigiMerchantId_fkey" FOREIGN KEY ("zindigiMerchantId") REFERENCES "ZindigiMerchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
