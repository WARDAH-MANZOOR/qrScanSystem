import { Decimal } from "@prisma/client/runtime/library";
import { PROVIDERS } from "constants/providers.js";
import prisma from "prisma/client.js";
import { transactionService } from "services/index.js";
import CustomError from "utils/custom_error.js";
import { encryptUtf } from "utils/enc_dec.js";

const getJazzCashCardMerchant = async (merchant_id: string) => {
  try {
    const credentials = await prisma.merchant.findFirst({
      where: {
        uid: merchant_id as string
      },
      include: {
        JazzCashCardMerchant: true
      }
    });
    if (!credentials?.JazzCashCardMerchant) {
      throw new CustomError("Merchant Credentials Not Found", 500)
    }
    let creds;
    if (credentials?.JazzCashCardMerchant) {
      creds = encryptUtf(JSON.stringify({
        jazzMerchantId: credentials?.JazzCashCardMerchant?.jazzMerchantId,
        password: credentials?.JazzCashCardMerchant?.password,
        integritySalt: credentials?.JazzCashCardMerchant?.integritySalt,
        returnUrl: credentials?.JazzCashCardMerchant?.returnUrl
      }))
    }
    else {
      creds = {}
    }
    return creds;
  }
  catch (err: any) {
    return {
      error: err?.message || "An Error Occured",
      statusCode: err?.statusCode || 500
    }
  }
}

const payWithCard = async (merchant_id: string, body: any) => {
  try {
    // find merchant by user id because merchant and user are the same
    const merchant = await prisma.merchant.findFirst({
      where: {
        uid: merchant_id,
      },
      include: {
        commissions: true
      }
    });

    if (!merchant || !merchant.uid) {
      throw new CustomError("Merchant not found", 404);
    }
    let commission;
    if (+(merchant?.commissions[0]?.cardRate as Decimal) != 0) {
      commission = +merchant?.commissions[0].commissionGST +
        +(merchant.commissions[0].cardRate as Decimal) +
        +merchant.commissions[0].commissionWithHoldingTax
    }
    else {
      commission = +merchant?.commissions[0].commissionGST +
        +merchant.commissions[0].commissionRate +
        +merchant.commissions[0].commissionWithHoldingTax
    }
    let id2 = body.order_id || body.transaction_id;
    const txn = await transactionService.createTxn({
      order_id: id2,
      transaction_id: body.transaction_id,
      amount: body.amount,
      status: "pending",
      type: "card",
      merchant_id: merchant.merchant_id,
      commission,
      settlementDuration: merchant.commissions[0].settlementDuration,
      providerDetails: {
        id: merchant.swichMerchantId as number,
        name: PROVIDERS.CARD,
        msisdn: body.accountNo,
        returnUrl: body?.returnUrl
      }
    })
    return {
      message: "Transaction created Successfully",
      statusCode: 201
    }
  }
  catch (err: any) {
    return {
      message: err?.message || "An Error Occured",
      statusCode: err?.statusCode || 500
    }
  }
}

export default {
  getJazzCashCardMerchant,
  payWithCard
}