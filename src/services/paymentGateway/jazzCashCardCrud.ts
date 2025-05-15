import prisma from "prisma/client.js";
import CustomError from "utils/custom_error.js";

export interface IjazzCashConfigParams {
  merchantId: string;
}

const getJazzCashCardMerchant = async (params: IjazzCashConfigParams) => {
  try {
    const where: any = {};

    if (params?.merchantId) where["merchantId"] = parseInt(params.merchantId);

    const jazzCashConfig = await prisma.jazzCashCardMerchant.findMany({
      where,
    });

    if (!jazzCashConfig) {
      throw new CustomError("JazzCash configuration not found", 404);
    }

    return jazzCashConfig;
  } catch (error: any) {
    throw new CustomError(error?.message || "An error occurred", 500);
  }
};

const createJazzCashCardMerchant = async (merchantData: any) => {
  try {
    const jazzCashConfig = await prisma.$transaction(async (prisma) => {
      const newMerchant = await prisma.jazzCashCardMerchant.create({
        data: merchantData,
      });
      return newMerchant;
    });

    return jazzCashConfig;
  } catch (error: any) {
    throw new CustomError(error?.message || "An error occurred", 500);
  }
};

const updateJazzCashCardMerchant = async (merchantId: number, updateData: any) => {
  try {
    const updatedMerchant = await prisma.$transaction(async (prisma) => {
      const merchant = await prisma.jazzCashCardMerchant.update({
        where: { id: merchantId },
        data: updateData,
      });
      return merchant;
    });

    return updatedMerchant;
  } catch (error: any) {
    throw new CustomError(error?.message || "An error occurred", 500);
  }
};

const deleteJazzCashCardMerchant = async (merchantId: number) => {
  try {
    const deletedMerchant = await prisma.$transaction(async (prisma) => {
      const merchant = await prisma.jazzCashCardMerchant.delete({
        where: { id: merchantId },
      });
      return merchant;
    });

    return deletedMerchant;
  } catch (error: any) {
    throw new CustomError(error?.message || "An error occurred", 500);
  }
};

export default {
  getJazzCashCardMerchant,
  createJazzCashCardMerchant,
  updateJazzCashCardMerchant,
  deleteJazzCashCardMerchant
}