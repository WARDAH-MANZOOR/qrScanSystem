-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "EasyPaisaDisburseAccountId" INTEGER;

-- CreateTable
CREATE TABLE "EasyPaisaDisburseAccount" (
    "id" SERIAL NOT NULL,
    "MSISDN" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "xChannel" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "EasyPaisaDisburseAccount_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_EasyPaisaDisburseAccountId_fkey" FOREIGN KEY ("EasyPaisaDisburseAccountId") REFERENCES "EasyPaisaDisburseAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
