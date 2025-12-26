-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "JazzCashDisburseAccountId" INTEGER;

-- CreateTable
CREATE TABLE "JazzCashDisburseAccount" (
    "id" SERIAL NOT NULL,
    "tokenKey" TEXT NOT NULL,
    "initialVector" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "JazzCashDisburseAccount_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_JazzCashDisburseAccountId_fkey" FOREIGN KEY ("JazzCashDisburseAccountId") REFERENCES "JazzCashDisburseAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
