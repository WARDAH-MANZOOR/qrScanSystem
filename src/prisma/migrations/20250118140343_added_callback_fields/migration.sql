-- AlterTable
ALTER TABLE "Disbursement" ADD COLUMN     "callback_response" TEXT,
ADD COLUMN     "callback_sent" BOOLEAN;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "callback_response" TEXT,
ADD COLUMN     "callback_sent" BOOLEAN;
