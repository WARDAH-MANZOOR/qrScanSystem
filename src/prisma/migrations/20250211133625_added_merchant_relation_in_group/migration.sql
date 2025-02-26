-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "merchant_id" INTEGER;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "Merchant"("merchant_id") ON DELETE SET NULL ON UPDATE CASCADE;
