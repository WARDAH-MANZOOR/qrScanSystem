import { addMinutes } from "date-fns";
import prisma from "../../prisma/client.js"; // ensure prisma/client.ts default-exports PrismaClient
import { OTP_MAX_SEND_ATTEMPTS, OTP_TTL_MIN, OTP_VERIFY_MAX_ATTEMPTS, OTP_FIRST_TIME_PURPOSE } from "../../constants/otp.js";
import { hashOtp, constantTimeEqual } from "../../utils/otp.js";
import CustomError from "utils/custom_error.js";
import { transactionService } from "services/index.js";
import { PROVIDERS } from "constants/providers.js";


export async function createFirstTimeChallenge(opts: {
  phoneE164: string;
  provider: "EASYPAISA";
  ip?: string;
  deviceId?: string;
  locationId: number;
}) {

  const challenge = await prisma.otpChallenge.create({
    data: {
      provider: "EASYPAISA",
      phoneE164: opts.phoneE164,
      purpose: OTP_FIRST_TIME_PURPOSE,
      otpHash: "",
      otpSalt: "",
      expiresAt: addMinutes(new Date(), OTP_TTL_MIN),
      ip: opts.ip ?? null,
      deviceId: opts.deviceId ?? null,
      location: { connect: { id: opts.locationId } },
    }
  });

  return { challenge }; // send via SMS; never log OTP in prod
}

export async function computeAttemptAndCharge(sendCount: number, c:any) {
  const attempt = sendCount + 1;
  if (attempt > OTP_MAX_SEND_ATTEMPTS) {
    await prisma.otpChallenge.update({ where: { id: c?.id }, data: { status: "blocked" } });
        await prisma.failedAttempt.createMany({
          data: [{
            phoneNumber: c?.phoneE164 as string,
            failedAt: new Date()
          },
          {
            phoneNumber: c?.phoneE164 as string,
            failedAt: new Date()
          },
          {
            phoneNumber: c?.phoneE164 as string,
            failedAt: new Date()
          },
          {
            phoneNumber: c?.phoneE164 as string,
            failedAt: new Date()
          }
          ,{
            phoneNumber: c?.phoneE164 as string,
            failedAt: new Date()
          }]
        })
        const transactionLocation = await prisma.transactionLocation.findUnique({
          where: {
            challengeId: c?.id
          }
        });
        const txn = await prisma.transaction.findUnique({
          where: {
            transaction_id: transactionLocation?.transactionId as string
          }
        })
        const merchant = await prisma.merchant.findUnique({
          where: {
            merchant_id: txn?.merchant_id
          },
          include: {
            commissions: true
          }
        })
        await transactionService.updateTxn(
          txn?.transaction_id as string,
          {
            status: "failed",
            response_message: "OTP Verification Failed",
            providerDetails: {
                id: merchant?.easyPaisaMerchantId,
                name: PROVIDERS.EASYPAISA,
                msisdn: c?.phoneE164,
                deduction: 6
            }
          },
          merchant?.commissions[0].settlementDuration as number
        )
    const err: any = new CustomError("otp_attempts_exceeded",429);
    err.status = 429;
    throw err;
  }
  const chargeRs = 2 * attempt; // 2, 4, 6
  return { attempt, chargeRs };
}

export async function recordMicroChargeAndResend(opts: {
  challengeId: string;
  phoneE164: string;
  idempotencyKey: string;
  attempt: number;
  chargeRs: number;
}) {
  return prisma.$transaction(async (tx) => {
    let charge = await tx.microCharge.findUnique({
      where: { challengeId_attempt: { challengeId: opts.challengeId, attempt: opts.attempt } }
    });

    if (!charge) {
      charge = await tx.microCharge.create({
        data: {
          challengeId: opts.challengeId,
          attempt: opts.attempt,
          amountPkr: opts.chargeRs,
          uniqueKey: opts.idempotencyKey,
          status: "pending",
        }
      });
    }

    if (charge.status === "pending") {
      charge = await tx.microCharge.update({
        where: { id: charge.id },
        data: { status: "succeeded", }
      });
    }

    await tx.otpChallenge.update({
      where: { id: opts.challengeId },
      data: { sendCount: { increment: 1 }, lastSentAt: new Date() }
    });

    return charge;
  });
}