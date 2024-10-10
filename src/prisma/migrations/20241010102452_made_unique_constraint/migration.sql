/*
  Warnings:

  - A unique constraint covering the columns `[merchant_id]` on the table `MerchantCommission` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "MerchantCommission_merchant_id_key" ON "MerchantCommission"("merchant_id");
