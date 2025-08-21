import { JsonObject } from "@prisma/client/runtime/library";
import { OTP_PROVIDER } from "constants/otp.js";
import { PROVIDERS } from "constants/providers.js";
import { NextFunction, Request, Response } from "express";
import prisma from "prisma/client.js";
import { transactionService } from "services/index.js";
import { computeAttemptAndCharge, createFirstTimeChallenge, recordMicroChargeAndResend } from "services/otp/index.js";
import { BusinessSmsApi } from "utils/business_sms_api.js";
import CustomError from "utils/custom_error.js";
import { hashOtp, makeSalt } from "utils/otp.js";
import { normalizeE164 } from "utils/phone.js";

const smsApi = new BusinessSmsApi({ id: 'devtects', pass: 'devtects1122' });

function generateOTP() {
    return Math.floor(10000 + Math.random() * 90000).toString(); // Ensures 5 digits
}

const sendOtp = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { accountNo, payId, provider, challengeId } = req.body;
        const idem = req.get("X-Idempotency-Key") ?? `${challengeId}:${Date.now()}`;

        const c = await prisma.otpChallenge.findUnique({ where: { id: challengeId } });
        if (!c || c.status !== "pending") return res.status(409).json({ error: "challenge_not_active" });
        const paymentRequest = await prisma.paymentRequest.findUnique({
            where: {
                id: payId
            }
        });
        const findMerchant = await prisma.merchant.findUnique({
            where: {
                merchant_id: paymentRequest?.userId as number
            },
            include: {
                commissions: true
            }
        })
        let commission;
        if (findMerchant?.commissions[0].commissionMode == "SINGLE") {
            commission = +findMerchant?.commissions[0].commissionGST +
                +findMerchant?.commissions[0].commissionRate +
                +findMerchant?.commissions[0].commissionWithHoldingTax
        }
        else {
            commission = +(findMerchant?.commissions[0].commissionGST ?? 0) +
                +(findMerchant?.commissions[0]?.easypaisaRate ?? 0) +
                +(findMerchant?.commissions[0].commissionWithHoldingTax ?? 0)
        }
        let id = transactionService.createTransactionId();
        let id2 = paymentRequest?.merchant_transaction_id || id;
        await transactionService.createTxn({
            order_id: id2,
            transaction_id: id,
            amount: paymentRequest?.amount,
            status: "pending",
            type: "wallet",
            merchant_id: paymentRequest?.userId,
            commission,
            settlementDuration: findMerchant?.commissions[0].settlementDuration,
            providerDetails: {
                id: findMerchant?.easyPaisaMerchantId,
                name: PROVIDERS.EASYPAISA,
                msisdn: accountNo,
            },
        })
        const otp = generateOTP(); // Generate the OTP
        const salt = makeSalt();
        const otpHash = hashOtp(otp, salt);
        await prisma.otpChallenge.update({ where: { id: challengeId }, data: { otpHash, otpSalt: salt } })
        await prisma.transactionLocation.update({where: {challengeId: challengeId}, data: {transactionId: id}})
        const { attempt, chargeRs } = await computeAttemptAndCharge(c.sendCount);

        await recordMicroChargeAndResend({
            challengeId,
            phoneE164: c.phoneE164,
            idempotencyKey: idem,
            attempt,
            chargeRs,
        });
        const phoneE164 = normalizeE164(accountNo);
        const msg =
            `Moaziz sarif apka ${provider} se transaction ka varification code ye hai: ${otp}. Khabardar! Fraud ka nishana na banein! Apna OTP ya PIN hargiz kisi ko na bataen.`;
        const result = await smsApi.sendSms({ to: accountNo, mask: "80223", msg, lang: "English", type: "Xml" });
        await prisma.paymentRequest.update({
            where: {
                id: payId
            },
            data: {
                metadata: {
                    otp: otp,
                    phone: accountNo
                }
            }
        })
        res.json({ success: true, response: result });
    } catch (error: any) {
        await prisma.otpChallenge.update({ where: { id: req.body.challengeId }, data: { status: 'blocked' } })
        // res.status(500).json({ success: false, error: error.message });
        next(error)
    }
}

export default {
    sendOtp
}