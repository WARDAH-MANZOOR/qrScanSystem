/*
  Warnings:

  - A unique constraint covering the columns `[name,txn_type,version]` on the table `Provider` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Provider_name_txn_type_version_key" ON "Provider"("name", "txn_type", "version");
