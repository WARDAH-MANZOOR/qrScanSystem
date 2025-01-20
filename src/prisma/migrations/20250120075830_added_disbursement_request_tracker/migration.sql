-- CreateTable
CREATE TABLE "ActiveRequestTracker" (
    "id" SERIAL NOT NULL,
    "activeRequests" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActiveRequestTracker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActiveRequestTracker_updatedAt_idx" ON "ActiveRequestTracker"("updatedAt");
