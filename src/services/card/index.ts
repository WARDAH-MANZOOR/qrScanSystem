import prisma from "prisma/client.js";
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
      throw new CustomError("Merchant Credentials Not Found",500)
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
  }
  catch (err: any) {
    return {
      error: err?.message || "An Error Occured",
      statusCode: err?.statusCode || 500
    }
  }
}

export default {
  getJazzCashCardMerchant
}