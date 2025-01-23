/*
  Warnings:

  - A unique constraint covering the columns `[merchant_transaction_id]` on the table `PaymentRequest` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "PaymentRequest_merchant_transaction_id_key" ON "PaymentRequest"("merchant_transaction_id");
