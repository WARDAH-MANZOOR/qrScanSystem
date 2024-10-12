/*
  Warnings:

  - The primary key for the `UserGroup` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "UserGroup" DROP CONSTRAINT "UserGroup_pkey",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "UserGroup_pkey" PRIMARY KEY ("id");
