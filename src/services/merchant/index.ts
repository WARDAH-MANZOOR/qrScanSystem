import prisma from "prisma/client.js";
import CustomError from "utils/custom_error.js";
import type { Merchant } from "types/merchant.js";

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
  } = payload;
  try {
    await prisma.merchant.update({
      data: {
        full_name: username,
        phone_number,
        company_name,
        company_url,
        city,
        payment_volume,
        commission,
      },
      where: { merchant_id: merchantId },
    });
    return "Merchant updated successfully";
  } catch (error: any) {
    console.log(error)
    throw new CustomError(error?.error, error?.statusCode);
  }
};

const getMerchants = async (params: any) => {
  try {
    let merchants = await prisma.merchant.findMany();
    return merchants;
  } catch (err: any) {
    throw new CustomError(err?.error, err?.statusCode);
  }
};
export default { updateMerchant, getMerchants };
