-- CreateTable
CREATE TABLE "Refund" (
    "id" SERIAL NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "merchant_id" INTEGER NOT NULL,
    "disbursementDate" TIMESTAMP(3) NOT NULL,
    "transactionAmount" DECIMAL(65,30) NOT NULL,
    "merchantAmount" DECIMAL(65,30) NOT NULL,
    "commission" DECIMAL(65,30) NOT NULL,
    "gst" DECIMAL(65,30) NOT NULL,
    "withholdingTax" DECIMAL(65,30) NOT NULL,
    "platform" DECIMAL(65,30),
    "account" TEXT,
    "provider" TEXT,
    "merchant_custom_order_id" TEXT,
    "system_order_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "response_message" TEXT NOT NULL DEFAULT 'success',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "callback_sent" BOOLEAN,
    "callback_response" TEXT,
    "reason" TEXT NOT NULL,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Refund_merchant_custom_order_id_key" ON "Refund"("merchant_custom_order_id");

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "Merchant"("merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
