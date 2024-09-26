/*
  Warnings:

  - A unique constraint covering the columns `[email,merchant_id]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Made the column `merchantId` on table `UserGroup` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "UserGroup" DROP CONSTRAINT "UserGroup_merchantId_fkey";

-- AlterTable
ALTER TABLE "UserGroup" ALTER COLUMN "merchantId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_merchant_id_key" ON "User"("email", "merchant_id");

-- AddForeignKey
ALTER TABLE "UserGroup" ADD CONSTRAINT "UserGroup_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
