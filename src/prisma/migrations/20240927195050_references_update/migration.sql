-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_merchant_id_fkey";

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
