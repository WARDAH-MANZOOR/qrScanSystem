-- DropForeignKey
ALTER TABLE "UserGroup" DROP CONSTRAINT "UserGroup_merchantId_fkey";

-- AlterTable
ALTER TABLE "UserGroup" ALTER COLUMN "merchantId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "UserGroup" ADD CONSTRAINT "UserGroup_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("merchant_id") ON DELETE SET NULL ON UPDATE CASCADE;
