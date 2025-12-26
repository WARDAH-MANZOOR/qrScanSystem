-- CreateTable
CREATE TABLE "JazzCashCardMerchant" (
    "id" SERIAL NOT NULL,
    "jazzMerchantId" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "returnUrl" TEXT NOT NULL,
    "integritySalt" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "merchant_of" TEXT,
    "merchantId" INTEGER NOT NULL,

    CONSTRAINT "JazzCashCardMerchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_JazzCashCardMerchantToMerchant" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_JazzCashCardMerchantToMerchant_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_JazzCashCardMerchantToMerchant_B_index" ON "_JazzCashCardMerchantToMerchant"("B");

-- AddForeignKey
ALTER TABLE "_JazzCashCardMerchantToMerchant" ADD CONSTRAINT "_JazzCashCardMerchantToMerchant_A_fkey" FOREIGN KEY ("A") REFERENCES "JazzCashCardMerchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_JazzCashCardMerchantToMerchant" ADD CONSTRAINT "_JazzCashCardMerchantToMerchant_B_fkey" FOREIGN KEY ("B") REFERENCES "Merchant"("merchant_id") ON DELETE CASCADE ON UPDATE CASCADE;
