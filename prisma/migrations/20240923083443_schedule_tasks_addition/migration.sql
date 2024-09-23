-- CreateTable
CREATE TABLE "ScheduledTask" (
    "id" SERIAL NOT NULL,
    "transactionId" INTEGER,
    "status" VARCHAR(50) NOT NULL,
    "scheduledAt" TIMESTAMPTZ,
    "executedAt" TIMESTAMPTZ,

    CONSTRAINT "ScheduledTask_pkey" PRIMARY KEY ("id")
);
