-- CreateTable
CREATE TABLE "public"."status_transition_allowlist" (
    "from_status" TEXT NOT NULL,
    "to_status" TEXT NOT NULL,
    "allow" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "status_transition_allowlist_pkey" PRIMARY KEY ("from_status","to_status")
);

-- CreateTable
CREATE TABLE "public"."transaction_status_history" (
    "id" BIGSERIAL NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "from_status" TEXT NOT NULL,
    "to_status" TEXT NOT NULL,
    "changed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" TEXT,
    "reason" TEXT,

    CONSTRAINT "transaction_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."blocked_status_change_log" (
    "id" BIGSERIAL NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "attempted_from" TEXT NOT NULL,
    "attempted_to" TEXT NOT NULL,
    "source" TEXT,
    "payload" JSONB,
    "logged_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocked_status_change_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transaction_status_history_transaction_id_idx" ON "public"."transaction_status_history"("transaction_id");

-- CreateIndex
CREATE INDEX "blocked_status_change_log_transaction_id_idx" ON "public"."blocked_status_change_log"("transaction_id");

-- AddForeignKey
ALTER TABLE "public"."transaction_status_history" ADD CONSTRAINT "transaction_status_history_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."Transaction"("transaction_id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."blocked_status_change_log" ADD CONSTRAINT "blocked_status_change_log_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."Transaction"("transaction_id") ON DELETE NO ACTION ON UPDATE CASCADE;