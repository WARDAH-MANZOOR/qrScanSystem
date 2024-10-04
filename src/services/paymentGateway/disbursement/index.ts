import { Decimal } from "@prisma/client/runtime/library";
import prisma from "prisma/client.js";
import CustomError from "utils/custom_error.js";

const checkMerchantExists = async (merchantId: number): Promise<boolean> => {
    const merchant = await prisma.user.findUnique({
        where: { id: merchantId },
    });
    return Boolean(merchant);
};

const calculateWalletBalance = async (merchantId: number): Promise<number> => {
    const result = await prisma.transaction.aggregate({
        _sum: {
            settled_amount: true,
        },
        where: {
            settlement: true,
            balance: {gt: new Decimal(0)},
            merchant_id: merchantId,
        },
    });
    console.log(result);
    const walletBalance = result._sum.settled_amount || new Decimal(0);
    return walletBalance.toNumber();
};


const getWalletBalance = async (merchantId: number): Promise<number> => {
    try {
        // Check if the merchant exists
        const merchantExists = await checkMerchantExists(merchantId);
        if (!merchantExists) {
            throw new CustomError('Merchant not found', 404);
        }

        // Calculate and return the wallet balance
        const walletBalance = await calculateWalletBalance(merchantId);
        return walletBalance;
    } catch (error) {
        if (error instanceof CustomError) {
            throw error; // Re-throw custom errors with proper status codes
        }
        console.error('Error fetching wallet balance:', error);
        throw new CustomError('Unable to fetch wallet balance', 500);
    }
};

export default getWalletBalance;