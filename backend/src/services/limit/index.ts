import { Prisma, PrismaClient, ProviderEnum, LimitPeriod } from "@prisma/client";
import { computeWindow } from "../../utils/limit_window.js";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

/** Load active limit rules for a merchant+provider. */
export async function getActivePolicies(
  merchantId: number,
  provider: ProviderEnum,
  tx = prisma
) {
  return tx.merchantLimitPolicy.findMany({
    where: { merchant_id: merchantId, provider, active: true },
  });
}

/**
 * Try to reserve usage for ALL active periods (DAY/WEEK/MONTH).
 * - Creates the current window row if missing.
 * - Conditionally increments usage if room exists.
 * - Records a PENDING reservation.
 * If any period has no room, throws LIMIT_EXCEEDED and rolls back everything.
 */
export async function reserveLimits(opts: {
  merchantId: number;
  provider: ProviderEnum;
  amount: Prisma.Decimal | number | string;
  merchantTxnId?: string; // optional idempotency key
}) {
  const { merchantId, provider, amount, merchantTxnId } = opts;

  const policies = await getActivePolicies(merchantId, provider);
  if (!policies.length) return { ok: true, reservationIds: [] }; // no limits configured

  const reservationIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    for (const policy of policies) {
      const { start, end } = computeWindow(policy.period, policy.timezone, policy.weekStartDow);
      const rid = randomUUID();

      // Ensure the usage row for this window exists
      await tx.merchantLimitUsage.upsert({
        where: {
          merchant_id_provider_period_windowStart: {
            merchant_id: merchantId,
            provider,
            period: policy.period,
            windowStart: start,
          },
        },
        create: {
          merchant_id: merchantId,
          provider,
          period: policy.period,
          windowStart: start,
          windowEnd: end,
        },
        update: {},
      });

      // Conditionally increment if within limits (single atomic UPDATE)
      const updated = await tx.$executeRawUnsafe<number>(
        `
        WITH p AS (
          SELECT id, "maxAmount", "maxTxn"
          FROM "MerchantLimitPolicy"
          WHERE merchant_id = $1 AND provider = $2::"ProviderEnum" AND period = $3::"LimitPeriod" AND active = true
        )
        UPDATE "MerchantLimitUsage" u
        SET "amountUsed" = u."amountUsed" + $6::numeric,
            "txnCount"  = u."txnCount"  + 1,
            "updatedAt" = now()
        FROM p
        WHERE u.merchant_id = $1
          AND u.provider     = $2::"ProviderEnum"
          AND u.period       = $3::"LimitPeriod"
          AND u."windowStart"= $4::timestamptz
          AND (p."maxAmount" IS NULL OR (u."amountUsed" + $6::numeric) <= p."maxAmount")
          AND (p."maxTxn"    IS NULL OR (u."txnCount"  + 1)        <= p."maxTxn")
        `,
        merchantId,                 // $1
        provider,                   // $2
        policy.period,              // $3
        start,                      // $4
        end,                        // $5 (kept for future use if needed)
        amount                      // $6
      );

      if (updated !== 1) {
        // If any period fails, abort everything
        const err = new Error("LIMIT_EXCEEDED") as any;
        err.code = "LIMIT_EXCEEDED";
        err.period = policy.period;
        throw err;
      }

      // Record the reservation
      await tx.limitReservation.create({
        data: {
          id: rid,
          merchant_id: merchantId,
          provider,
          period: policy.period,
          windowStart: start,
          amount: new Prisma.Decimal(amount),
          merchant_txn_id: merchantTxnId ?? null,
          status: "PENDING",
        },
      });

      reservationIds.push(rid);
    }
  }, { isolationLevel: "Serializable" }); // strongest safety under contention

  return { ok: true, reservationIds };
}

/** Mark PENDING reservations as COMMITTED (on success). */
export async function commitReservations(reservationIds: string[]) {
  if (!reservationIds.length) return;
  await prisma.limitReservation.updateMany({
    where: { id: { in: reservationIds }, status: "PENDING" },
    data: { status: "COMMITTED" },
  });
}

/** Cancel PENDING reservations and subtract back their usage (on failure). */
export async function cancelReservations(reservationIds: string[]) {
  if (!reservationIds.length) return;

  await prisma.$transaction(async (tx) => {
    const rows = await tx.limitReservation.findMany({
      where: { id: { in: reservationIds }, status: "PENDING" },
    });
    if (!rows.length) return;

    await tx.limitReservation.updateMany({
      where: { id: { in: rows.map(r => r.id) } },
      data: { status: "CANCELED" },
    });

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
