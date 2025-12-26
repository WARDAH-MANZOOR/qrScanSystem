-- CreateTable
CREATE TABLE "DisbursementDispute" (
    "id" SERIAL NOT NULL,
    "transactionId" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "disbursementDate" TIMESTAMP(3) NOT NULL,
    "sender" TEXT NOT NULL,
    "status" TEXT,
    "message" TEXT,
    "merchant_id" INTEGER NOT NULL,

    CONSTRAINT "DisbursementDispute_pkey" PRIMARY KEY ("id")
);
