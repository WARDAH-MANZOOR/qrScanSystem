-- CreateTable
CREATE TABLE "public"."Deduction" (
    "id" SERIAL NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "orderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,

    CONSTRAINT "Deduction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Deduction" ADD CONSTRAINT "Deduction_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "public"."Merchant"("merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
