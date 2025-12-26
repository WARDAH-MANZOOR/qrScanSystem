-- CreateTable
CREATE TABLE "usdt_settlements" (
    "id" SERIAL NOT NULL,
    "merchant_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "pkr_amount" DOUBLE PRECISION NOT NULL,
    "usdt_amount" DOUBLE PRECISION NOT NULL,
    "usdt_pkr_rate" DOUBLE PRECISION NOT NULL,
    "conversion_charges" DOUBLE PRECISION NOT NULL,
    "total_usdt" DOUBLE PRECISION NOT NULL,
    "wallet_address" TEXT NOT NULL,

    CONSTRAINT "usdt_settlements_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "usdt_settlements" ADD CONSTRAINT "usdt_settlements_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
