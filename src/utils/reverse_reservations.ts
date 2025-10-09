// src/jobs/expireReservations.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * Expire PENDING reservations older than N 30 and roll back usage.
 */
export async function expireOldReservations() {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000);

  // fetch to know what to reverse
  const rows = await prisma.limitReservation.findMany({
    where: { status: "PENDING", createdAt: { lt: cutoff } },
  });
  if (!rows.length) return;

  await prisma.$transaction(async (tx) => {
    // mark EXPIRED
    await tx.limitReservation.updateMany({
      where: { id: { in: rows.map(r => r.id) }, status: "PENDING" },
      data: { status: "EXPIRED" },
    });

    // reverse counters
    for (const r of rows) {
      await tx.$executeRawUnsafe(
        `
        UPDATE "MerchantLimitUsage" u
        SET "amountUsed" = GREATEST(u."amountUsed" - $5::numeric, 0),
            "txnCount"  = GREATEST(u."txnCount"  - 1, 0),
            "updatedAt" = now()
        WHERE u.merchant_id = $1
          AND u.provider     = $2::"ProviderEnum"
          AND u.period       = $3::"LimitPeriod"
          AND u."windowStart"= $4::timestamptz
        `,
        r.merchant_id, r.provider, r.period, r.windowStart, r.amount
      );
    }
  });
}
