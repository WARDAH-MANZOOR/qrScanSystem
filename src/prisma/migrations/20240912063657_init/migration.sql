-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('completed', 'pending', 'failed');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('purchase', 'refund', 'chargeback');

-- CreateTable
CREATE TABLE "Transaction" (
    "transaction_id" SERIAL NOT NULL,
    "date_time" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "issuer_id" INTEGER NOT NULL,
    "status" "TransactionStatus" NOT NULL,
    "type" "TransactionType" NOT NULL,
    "response_message" TEXT,
    "settlement" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("transaction_id")
);

-- CreateTable
CREATE TABLE "pan_details" (
    "pan_details_id" SERIAL NOT NULL,
    "transaction_id" INTEGER NOT NULL,
    "pan" TEXT NOT NULL,
    "stan" TEXT NOT NULL,

    CONSTRAINT "pan_details_pkey" PRIMARY KEY ("pan_details_id")
);

-- CreateTable
CREATE TABLE "issuer" (
    "issuer_id" SERIAL NOT NULL,
    "issuer_name" TEXT NOT NULL,

    CONSTRAINT "issuer_pkey" PRIMARY KEY ("issuer_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_transaction_id_key" ON "Transaction"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "pan_details_transaction_id_key" ON "pan_details"("transaction_id");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_issuer_id_fkey" FOREIGN KEY ("issuer_id") REFERENCES "issuer"("issuer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pan_details" ADD CONSTRAINT "pan_details_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "Transaction"("transaction_id") ON DELETE RESTRICT ON UPDATE CASCADE;
