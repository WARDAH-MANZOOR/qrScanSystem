-- CreateTable
CREATE TABLE "Disbursement" (
    "id" SERIAL NOT NULL,
    "merchant_id" INTEGER NOT NULL,
    "disbursementDate" TIMESTAMP(3) NOT NULL,
    "transactionAmount" DECIMAL(65,30) NOT NULL,
    "commission" DECIMAL(65,30) NOT NULL,
    "gst" DECIMAL(65,30) NOT NULL,
    "withholdingTax" DECIMAL(65,30) NOT NULL,
    "merchantAmount" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Disbursement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Disbursement_merchant_id_disbursementDate_key" ON "Disbursement"("merchant_id", "disbursementDate");

-- AddForeignKey
ALTER TABLE "Disbursement" ADD CONSTRAINT "Disbursement_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "Merchant"("merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
