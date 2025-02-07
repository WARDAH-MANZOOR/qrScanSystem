-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "balanceToDisburse" DECIMAL(10,2) DEFAULT 0.00;

-- CreateTable
CREATE TABLE "DisbursementRequest" (
    "id" SERIAL NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "requestedAmount" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DisbursementRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DisbursementRequest" ADD CONSTRAINT "DisbursementRequest_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
