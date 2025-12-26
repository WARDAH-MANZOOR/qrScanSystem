-- CreateEnum
CREATE TYPE "public"."OtpStatus" AS ENUM ('pending', 'verified', 'expired', 'blocked');

-- CreateEnum
CREATE TYPE "public"."ChargeStatus" AS ENUM ('pending', 'succeeded', 'failed');

-- CreateEnum
CREATE TYPE "public"."LocationSource" AS ENUM ('device', 'ip', 'inferred');

-- CreateTable
CREATE TABLE "public"."ProviderFirstSeen" (
    "id" SERIAL NOT NULL,
    "provider" "public"."ProviderEnum" NOT NULL,
    "phoneE164" TEXT NOT NULL,
    "userId" INTEGER,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderFirstSeen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OtpChallenge" (
    "id" TEXT NOT NULL,
    "provider" "public"."ProviderEnum" NOT NULL,
    "phoneE164" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" "public"."OtpStatus" NOT NULL DEFAULT 'pending',
    "otpHash" TEXT NOT NULL,
    "otpSalt" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "sendCount" INTEGER NOT NULL DEFAULT 0,
    "verifyAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMP(3),
    "ip" TEXT,
    "deviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MicroCharge" (
    "id" SERIAL NOT NULL,
    "challengeId" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL,
    "amountPkr" INTEGER NOT NULL,
    "status" "public"."ChargeStatus" NOT NULL DEFAULT 'pending',
    "providerTxnId" TEXT,
    "uniqueKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MicroCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TransactionLocation" (
    "id" SERIAL NOT NULL,
    "transactionId" TEXT,
    "challengeId" TEXT,
    "lat" DECIMAL(9,6) NOT NULL,
    "lng" DECIMAL(9,6) NOT NULL,
    "accuracyM" DECIMAL(6,2),
    "geohash" TEXT,
    "source" "public"."LocationSource" NOT NULL,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "ip" TEXT,
    "tz" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProviderFirstSeen_phoneE164_idx" ON "public"."ProviderFirstSeen"("phoneE164");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderFirstSeen_provider_phoneE164_key" ON "public"."ProviderFirstSeen"("provider", "phoneE164");

-- CreateIndex
CREATE INDEX "OtpChallenge_phoneE164_provider_status_expiresAt_idx" ON "public"."OtpChallenge"("phoneE164", "provider", "status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "MicroCharge_challengeId_attempt_key" ON "public"."MicroCharge"("challengeId", "attempt");

-- CreateIndex
CREATE UNIQUE INDEX "MicroCharge_uniqueKey_key" ON "public"."MicroCharge"("uniqueKey");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionLocation_challengeId_key" ON "public"."TransactionLocation"("challengeId");

-- CreateIndex
CREATE INDEX "TransactionLocation_challengeId_idx" ON "public"."TransactionLocation"("challengeId");

-- CreateIndex
CREATE INDEX "TransactionLocation_transactionId_idx" ON "public"."TransactionLocation"("transactionId");

-- AddForeignKey
ALTER TABLE "public"."MicroCharge" ADD CONSTRAINT "MicroCharge_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "public"."OtpChallenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TransactionLocation" ADD CONSTRAINT "TransactionLocation_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "public"."Transaction"("transaction_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TransactionLocation" ADD CONSTRAINT "TransactionLocation_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "public"."OtpChallenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;
