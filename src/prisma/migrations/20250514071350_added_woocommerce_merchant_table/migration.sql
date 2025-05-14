-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "wooMerchantId" INTEGER;

-- CreateTable
CREATE TABLE "WoocommerceMerchants" (
    "id" SERIAL NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "WoocommerceMerchants_id_key" ON "WoocommerceMerchants"("id");

-- AddForeignKey
ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_wooMerchantId_fkey" FOREIGN KEY ("wooMerchantId") REFERENCES "WoocommerceMerchants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
