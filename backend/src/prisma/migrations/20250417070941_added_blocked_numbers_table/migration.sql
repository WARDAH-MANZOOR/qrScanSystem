-- CreateTable
CREATE TABLE "BlockedPhoneNumbers" (
    "id" SERIAL NOT NULL,
    "phoneNumber" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "BlockedPhoneNumbers_id_key" ON "BlockedPhoneNumbers"("id");

-- CreateIndex
CREATE UNIQUE INDEX "BlockedPhoneNumbers_phoneNumber_key" ON "BlockedPhoneNumbers"("phoneNumber");
