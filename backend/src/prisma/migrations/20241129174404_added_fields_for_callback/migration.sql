-- CreateEnum
CREATE TYPE "CallbackMode" AS ENUM ('SINGLE', 'DOUBLE');

-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "callback_mode" "CallbackMode" NOT NULL DEFAULT 'SINGLE',
ADD COLUMN     "payout_callback" TEXT;
