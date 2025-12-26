/*
  Warnings:

  - A unique constraint covering the columns `[orderId]` on the table `ChargeBack` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ChargeBack_orderId_key" ON "ChargeBack"("orderId");
