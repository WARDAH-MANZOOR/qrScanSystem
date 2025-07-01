import prisma from "prisma/client.js";
import CustomError from "utils/custom_error.js";
const getJazzCashCardMerchant = async (params) => {
    try {
        const where = {};
        if (params?.merchantId)
            where["merchantId"] = parseInt(params.merchantId);
        const jazzCashConfig = await prisma.jazzCashCardMerchant.findMany({
            where,
        });
        if (!jazzCashConfig) {
            throw new CustomError("JazzCash configuration not found", 404);
        }
        return jazzCashConfig;
    }
    catch (error) {
        throw new CustomError(error?.message || "An error occurred", 500);
    }
};
const createJazzCashCardMerchant = async (merchantData) => {
    try {
        const jazzCashConfig = await prisma.$transaction(async (prisma) => {
            const newMerchant = await prisma.jazzCashCardMerchant.create({
                data: merchantData,
            });
            return newMerchant;
        });
        return jazzCashConfig;
    }
    catch (error) {
        throw new CustomError(error?.message || "An error occurred", 500);
    }
};
const updateJazzCashCardMerchant = async (merchantId, updateData) => {
    try {
        const updatedMerchant = await prisma.$transaction(async (prisma) => {
            const merchant = await prisma.jazzCashCardMerchant.update({
                where: { id: merchantId },
                data: updateData,
            });
            return merchant;
        });
        return updatedMerchant;
    }
    catch (error) {
        throw new CustomError(error?.message || "An error occurred", 500);
    }
};
const deleteJazzCashCardMerchant = async (merchantId) => {
    try {
        const deletedMerchant = await prisma.$transaction(async (prisma) => {
            const merchant = await prisma.jazzCashCardMerchant.delete({
                where: { id: merchantId },
            });
            return merchant;
        });
        return deletedMerchant;
    }
    catch (error) {
        throw new CustomError(error?.message || "An error occurred", 500);
    }
};
export default {
    getJazzCashCardMerchant,
    createJazzCashCardMerchant,
    updateJazzCashCardMerchant,
    deleteJazzCashCardMerchant
};
