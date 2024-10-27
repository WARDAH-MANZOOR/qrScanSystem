import prisma from "prisma/client.js";
import CustomError from "utils/custom_error.js";
import type { Merchant } from "types/merchant.js";
import { hashPassword } from "services/authentication/index.js";

const updateMerchant = async (payload: Merchant) => {
  const {
    username,
    phone_number,
    company_name,
    company_url,
    city,
    payment_volume,
    commission,
    merchantId,
    commissionGST,
    commissionWithHoldingTax,
    disbursementGST,
    disbursementRate,
    disbursementWithHoldingTax,
    settlementDuration,
    jazzCashMerchantId,
    easyPaisaMerchantId,
    swichMerchantId,
    webhook_url,
  } = payload;
  try {
    let result = await prisma.$transaction(async (tx) => {
      const user = await tx.merchant.update({
        data: {
          full_name: username,
          phone_number,
          company_name,
          company_url,
          city,
          payment_volume,
          jazzCashMerchantId,
          easyPaisaMerchantId,
          swichMerchantId,
          webhook_url,
        },
        where: { merchant_id: +merchantId },
      });
      let finance = await tx.merchantFinancialTerms.findUnique({
        where: { merchant_id: +merchantId },
      });
      await tx.merchantFinancialTerms.update({
        data: {
          commissionRate: commission,
          commissionGST: commissionGST,
          commissionWithHoldingTax: commissionWithHoldingTax,
          disbursementGST: disbursementGST,
          disbursementRate: disbursementRate,
          disbursementWithHoldingTax: disbursementWithHoldingTax,
          settlementDuration:
            settlementDuration != undefined
              ? settlementDuration
              : finance?.settlementDuration,
        },
        where: { merchant_id: +merchantId },
      });
      return "Merchant updated successfully";
    });
    return result;
  } catch (error: any) {
    console.log(error);
    throw new CustomError(
      error.error || "Internal Server Error",
      error.statusCode || 500
    );
  }
};

const getMerchants = async (params: any) => {
  try {
    const where: any = {};

    if (params?.uid) {
      where["uid"] = params.uid;
    }

    let merchants = await prisma.merchant.findMany({
      where,
      include: {
        commissions: true,
      },
    });
    return merchants;
  } catch (err: any) {
    throw new CustomError(err?.error, err?.statusCode);
  }
};

const findOne = async (params: any) => {
  try {
    const where: any = {};

    if (params?.uid) {
      where["uid"] = params.uid;
    }

    let merchants = await prisma.merchant.findFirst({
      where,
      include: {
        commissions: true,
      },
    });
    return merchants;
  } catch (err: any) {
    throw new CustomError(err?.error, err?.statusCode);
  }
};

const addMerchant = async (payload: Merchant) => {
  const {
    username,
    email,
    password,
    phone_number,
    company_name,
    company_url,
    city,
    payment_volume,
    commission,
    commissionGST,
    commissionWithHoldingTax,
    disbursementGST,
    disbursementRate,
    disbursementWithHoldingTax,
    settlementDuration,
    jazzCashMerchantId,
    easyPaisaMerchantId,
    swichMerchantId,
    webhook_url,
  } = payload;

  if (settlementDuration == undefined) {
    throw new CustomError("Settlement Duration Required", 400);
  }

  try {
    const hashedPassword = await hashPassword(password as string);

    const result = await prisma.$transaction(async (tx) => {
      // Create User
      const user = await tx.user.create({
        data: {
          email: email as string,
          password: hashedPassword,
          username,
        },
      });

      // Create Merchant
      const merchant = await tx.merchant.create({
        data: {
          merchant_id: user.id,
          user_id: user.id,
          full_name: username,
          phone_number,
          company_name,
          company_url,
          city,
          payment_volume,
          jazzCashMerchantId,
          easyPaisaMerchantId,
          swichMerchantId,
          webhook_url,
        },
      });

      // Create Merchant Financial Terms
      await tx.merchantFinancialTerms.create({
        data: {
          commissionRate: commission,
          commissionGST: commissionGST ?? 0,
          commissionWithHoldingTax: commissionWithHoldingTax ?? 0,
          disbursementGST: disbursementGST ?? 0,
          disbursementRate: disbursementRate ?? 0,
          disbursementWithHoldingTax: disbursementWithHoldingTax ?? 0,
          settlementDuration: +settlementDuration,
          merchant_id: user.id,
        },
      });

      // Create UserGroup
      await tx.userGroup.create({
        data: {
          userId: user.id,
          groupId: 2, // Adjust group ID as necessary
          merchantId: user.id,
        },
      });

      return "Merchant created successfully";
    });

    return result;
  } catch (error: any) {
    console.error("Error adding merchant:", error);
    throw new CustomError(
      error.message || "Internal Server Error",
      error.statusCode || 500
    );
  }
};

export default { updateMerchant, getMerchants, addMerchant, findOne };
