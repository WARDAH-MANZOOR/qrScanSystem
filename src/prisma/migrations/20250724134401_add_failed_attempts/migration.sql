-- CreateTable
CREATE TABLE "FailedAttempt" (
    "id" SERIAL NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "failedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FailedAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FailedAttempt_phoneNumber_failedAt_idx" ON "FailedAttempt"("phoneNumber", "failedAt");
