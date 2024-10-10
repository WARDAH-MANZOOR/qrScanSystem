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
    settlementDuration
  } = payload;
  try {
    const user = await prisma.merchant.update({
      data: {
        full_name: username,
        phone_number,
        company_name,
        company_url,
        city,
        payment_volume,
      },
      where: { merchant_id: merchantId },
    });
    await prisma.merchantCommission.update({
      data: {
        commissionRate: commission,
        commissionGST: commissionGST,
        commissionWithHoldingTax: commissionWithHoldingTax,
        disbursementGST: disbursementGST,
        disbursementRate: disbursementRate,
        disbursementWithHoldingTax: disbursementWithHoldingTax,
        settlementDuration: settlementDuration,
      },
      where: { merchant_id: merchantId }
    })
    return "Merchant updated successfully";
  } catch (error: any) {
    console.log(error);
    throw new CustomError(error?.error, error?.statusCode);
  }
};

const getMerchants = async (params: any) => {
  try {
    let merchants = await prisma.merchant.findMany(
      {
        include: {
          commissions: true
        }
      }
    );
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
    settlementDuration
  } = payload;
  if (settlementDuration == undefined) {
    return "Settlment Duration Required";
  }
  try {
    let pass = await hashPassword(password as string);
    let user = await prisma.user.create({
      data: {
        email: email as string,
        password: pass,
        username,
        merchant_id: undefined,
      },
    });
    await prisma.merchant.create({
      data: {
        merchant_id: user.id,
        user_id: user.id,
        full_name: username,
        phone_number,
        company_name,
        company_url,
        city,
        payment_volume,
      },
    });
    await prisma.merchantCommission.create({
      data: {
        commissionRate: commission,
        commissionGST: commissionGST ?? 0,
        commissionWithHoldingTax: commissionWithHoldingTax ?? 0,
        disbursementGST: disbursementGST ?? 0,
        disbursementRate: disbursementRate ?? 0,
        disbursementWithHoldingTax: disbursementWithHoldingTax ?? 0,
        settlementDuration: settlementDuration ?? 2,
        merchant_id: user.id
      }
    })
    await prisma.user.update({
      where: { id: user.id },
      data: {
        merchant_id: user.id,
      },
    });
    await prisma.userGroup.create({
      data: {
        userId: user.id,
        groupId: 2,
        merchantId: user.id, // Group ID 1 or 2
      },
    });
    return "Merchant created successfully";
  } catch (error: any) {
    throw new CustomError(error, error?.statusCode);
  }
};
export default { updateMerchant, getMerchants, addMerchant };
