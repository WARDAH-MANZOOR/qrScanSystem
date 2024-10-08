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

const addMerchant = async (payload: any) => {
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
  } = payload;
  try {
    let pass = await hashPassword(password);
    let user = await prisma.user.create({
      data: {
        email,
        password: pass,
        username,
        merchant_id: undefined
      }
    })
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
        commission,
      }
    });
    await prisma.user.update({
      where: { id: user.id },
      data: {
        merchant_id: user.id
      }
    })
    await prisma.userGroup.create({
      data: {
          userId: user.id,
          groupId: 2,
          merchantId: user.id // Group ID 1 or 2
      }
  });
    return "Merchant created successfully";
  } catch (error: any) {
    console.log(error)
    throw new CustomError(error?.error, error?.statusCode);
  }
}
export default { updateMerchant, getMerchants, addMerchant };
