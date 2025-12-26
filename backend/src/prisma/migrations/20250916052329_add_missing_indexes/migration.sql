-- CreateIndex
CREATE INDEX "idx_scheduledtask_status_at_id" ON "public"."ScheduledTask"("status", "scheduledAt", "id");

-- CreateIndex
CREATE INDEX "idx_tx_merchant_status_date" ON "public"."Transaction"("merchant_id", "status", "date_time");
