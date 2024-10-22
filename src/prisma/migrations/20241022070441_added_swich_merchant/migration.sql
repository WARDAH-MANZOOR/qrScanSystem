-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "swichMerchantId" INTEGER;

-- CreateTable
CREATE TABLE "SwichMerchant" (
    "id" SERIAL NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT,

    CONSTRAINT "SwichMerchant_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_swichMerchantId_fkey" FOREIGN KEY ("swichMerchantId") REFERENCES "SwichMerchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
