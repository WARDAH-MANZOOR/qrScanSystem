-- CreateTable
CREATE TABLE "JazzCashMerchant" (
    "id" SERIAL NOT NULL,
    "merchantId" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "returnUrl" TEXT NOT NULL,
    "integritySalt" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "JazzCashMerchant_pkey" PRIMARY KEY ("id")
);
