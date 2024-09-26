-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "merchant_id" INTEGER;

-- AlterTable
ALTER TABLE "UserGroup" ADD COLUMN     "merchantId" INTEGER;

-- CreateTable
CREATE TABLE "Merchant" (
    "merchant_id" SERIAL NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "company_url" TEXT,
    "city" TEXT NOT NULL,
    "payment_volume" DECIMAL(10,2),

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("merchant_id")
);

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "Merchant"("merchant_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_id_fkey" FOREIGN KEY ("id") REFERENCES "Merchant"("merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGroup" ADD CONSTRAINT "UserGroup_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("merchant_id") ON DELETE SET NULL ON UPDATE CASCADE;
