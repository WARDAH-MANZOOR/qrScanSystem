-- AlterEnum
ALTER TYPE "EasypaisaPaymentMethodEnum" ADD VALUE 'PAYFAST';

-- CreateTable
CREATE TABLE "PayFastMerchant" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "securedKey" TEXT NOT NULL,
    "merchantId" TEXT,

    CONSTRAINT "PayFastMerchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MerchantToPayFastMerchant" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_MerchantToPayFastMerchant_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_MerchantToPayFastMerchant_B_index" ON "_MerchantToPayFastMerchant"("B");

-- AddForeignKey
ALTER TABLE "_MerchantToPayFastMerchant" ADD CONSTRAINT "_MerchantToPayFastMerchant_A_fkey" FOREIGN KEY ("A") REFERENCES "Merchant"("merchant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MerchantToPayFastMerchant" ADD CONSTRAINT "_MerchantToPayFastMerchant_B_fkey" FOREIGN KEY ("B") REFERENCES "PayFastMerchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
