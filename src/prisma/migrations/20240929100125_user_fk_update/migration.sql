-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_merchant_id_fkey";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "merchant_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "Merchant"("merchant_id") ON DELETE SET NULL ON UPDATE CASCADE;
