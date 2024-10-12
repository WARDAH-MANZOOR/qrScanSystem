-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('completed', 'pending', 'failed');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('wallet', 'card', 'bank');

-- CreateEnum
CREATE TYPE "ProviderEnum" AS ENUM ('JAZZCASH', 'EASYPAISA');

-- CreateTable
CREATE TABLE "Group" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGroup" (
    "userId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    "merchantId" INTEGER,

    CONSTRAINT "UserGroup_pkey" PRIMARY KEY ("userId","groupId")
);

-- CreateTable
CREATE TABLE "GroupPermission" (
    "groupId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,

    CONSTRAINT "GroupPermission_pkey" PRIMARY KEY ("groupId","permissionId")
);

-- CreateTable
CREATE TABLE "Merchant" (
    "uid" TEXT,
    "merchant_id" SERIAL NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "company_url" TEXT,
    "city" TEXT NOT NULL,
    "payment_volume" DECIMAL(10,2),
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("merchant_id")
);

-- CreateTable
CREATE TABLE "MerchantProviderCredential" (
    "id" SERIAL NOT NULL,
    "merchant_id" INTEGER NOT NULL,
    "provider" "ProviderEnum" NOT NULL,
    "merchantOrStoreId" TEXT NOT NULL,
    "passwordOrHashKey" TEXT NOT NULL,
    "returnOrPostBackUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantProviderCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantFinancialTerms" (
    "id" SERIAL NOT NULL,
    "merchant_id" INTEGER NOT NULL,
    "commissionRate" DECIMAL(10,2) NOT NULL,
    "commissionWithHoldingTax" DECIMAL(10,2) NOT NULL,
    "commissionGST" DECIMAL(10,2) NOT NULL,
    "disbursementRate" DECIMAL(10,2) NOT NULL,
    "disbursementWithHoldingTax" DECIMAL(10,2) NOT NULL,
    "disbursementGST" DECIMAL(10,2) NOT NULL,
    "settlementDuration" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantFinancialTerms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "transaction_id" TEXT NOT NULL,
    "date_time" TIMESTAMP(3) NOT NULL,
    "original_amount" DECIMAL(10,2),
    "status" "TransactionStatus" NOT NULL,
    "type" "TransactionType" NOT NULL,
    "response_message" TEXT,
    "settlement" BOOLEAN NOT NULL DEFAULT false,
    "settled_amount" DECIMAL(10,2),
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "merchant_id" INTEGER NOT NULL,
    "customer_id" INTEGER,
    "additionalInfoId" INTEGER,
    "providerId" INTEGER,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("transaction_id")
);

-- CreateTable
CREATE TABLE "AdditionalInfo" (
    "id" SERIAL NOT NULL,
    "bank_id" TEXT,
    "bill_reference" TEXT,
    "retrieval_ref" TEXT,
    "sub_merchant_id" TEXT,
    "settlement_expiry" TEXT,
    "custom_field_1" TEXT,
    "custom_field_2" TEXT,
    "custom_field_3" TEXT,
    "custom_field_4" TEXT,
    "custom_field_5" TEXT,

    CONSTRAINT "AdditionalInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Provider" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "txn_type" TEXT,
    "version" TEXT,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledTask" (
    "id" SERIAL NOT NULL,
    "transactionId" TEXT NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "scheduledAt" TIMESTAMPTZ,
    "executedAt" TIMESTAMPTZ,

    CONSTRAINT "ScheduledTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettlementReport" (
    "id" SERIAL NOT NULL,
    "merchant_id" INTEGER NOT NULL,
    "settlementDate" TIMESTAMP(3) NOT NULL,
    "transactionCount" INTEGER NOT NULL,
    "transactionAmount" DECIMAL(10,2) NOT NULL,
    "commission" DECIMAL(10,2) NOT NULL,
    "gst" DECIMAL(10,2) NOT NULL,
    "withholdingTax" DECIMAL(10,2) NOT NULL,
    "merchantAmount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SettlementReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Group_name_key" ON "Group"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_key" ON "Permission"("name");

-- CreateIndex
CREATE INDEX "MerchantProviderCredential_merchant_id_provider_idx" ON "MerchantProviderCredential"("merchant_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantFinancialTerms_merchant_id_key" ON "MerchantFinancialTerms"("merchant_id");

-- CreateIndex
CREATE INDEX "MerchantFinancialTerms_merchant_id_idx" ON "MerchantFinancialTerms"("merchant_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_transaction_id_key" ON "Transaction"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_additionalInfoId_key" ON "Transaction"("additionalInfoId");

-- CreateIndex
CREATE UNIQUE INDEX "Provider_name_txn_type_version_key" ON "Provider"("name", "txn_type", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledTask_transactionId_key" ON "ScheduledTask"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "SettlementReport_merchant_id_settlementDate_key" ON "SettlementReport"("merchant_id", "settlementDate");

-- AddForeignKey
ALTER TABLE "UserGroup" ADD CONSTRAINT "UserGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGroup" ADD CONSTRAINT "UserGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGroup" ADD CONSTRAINT "UserGroup_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("merchant_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupPermission" ADD CONSTRAINT "GroupPermission_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupPermission" ADD CONSTRAINT "GroupPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantProviderCredential" ADD CONSTRAINT "MerchantProviderCredential_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "Merchant"("merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantFinancialTerms" ADD CONSTRAINT "MerchantFinancialTerms_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "Merchant"("merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_additionalInfoId_fkey" FOREIGN KEY ("additionalInfoId") REFERENCES "AdditionalInfo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledTask" ADD CONSTRAINT "ScheduledTask_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("transaction_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementReport" ADD CONSTRAINT "SettlementReport_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "Merchant"("merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
