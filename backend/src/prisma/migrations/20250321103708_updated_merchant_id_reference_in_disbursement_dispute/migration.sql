-- AddForeignKey
ALTER TABLE "DisbursementDispute" ADD CONSTRAINT "DisbursementDispute_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "Merchant"("merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
