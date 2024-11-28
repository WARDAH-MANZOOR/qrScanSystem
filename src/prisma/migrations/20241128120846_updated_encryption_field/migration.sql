-- AlterTable
ALTER TABLE "Merchant" ALTER COLUMN "encrypted" DROP NOT NULL,
ALTER COLUMN "encrypted" SET DEFAULT 'false',
ALTER COLUMN "encrypted" SET DATA TYPE TEXT;
