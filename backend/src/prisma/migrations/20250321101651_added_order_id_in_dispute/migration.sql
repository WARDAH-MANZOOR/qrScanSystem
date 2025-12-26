/*
  Warnings:

  - Added the required column `orderId` to the `DisbursementDispute` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DisbursementDispute" ADD COLUMN     "orderId" TEXT NOT NULL;
