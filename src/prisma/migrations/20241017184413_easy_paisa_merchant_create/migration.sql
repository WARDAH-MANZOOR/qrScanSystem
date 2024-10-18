-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "easyPaisaMerchantId" INTEGER;

-- CreateTable
CREATE TABLE "EasyPaisaMerchant" (
    "id" SERIAL NOT NULL,
    "storeId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "credentials" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "merchantId" INTEGER NOT NULL,

    CONSTRAINT "EasyPaisaMerchant_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_easyPaisaMerchantId_fkey" FOREIGN KEY ("easyPaisaMerchantId") REFERENCES "EasyPaisaMerchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
