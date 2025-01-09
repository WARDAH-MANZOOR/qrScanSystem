-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "backupEasypaisaWalletId" INTEGER,
ADD COLUMN     "backupJazzCashWalletId" INTEGER;

-- AddForeignKey
ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_backupJazzCashWalletId_fkey" FOREIGN KEY ("backupJazzCashWalletId") REFERENCES "JazzCashMerchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_backupEasypaisaWalletId_fkey" FOREIGN KEY ("backupEasypaisaWalletId") REFERENCES "EasyPaisaMerchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
