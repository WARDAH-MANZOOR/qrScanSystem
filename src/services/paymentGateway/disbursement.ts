import { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import prisma from "../../prisma/client.js";
import CustomError from "../../utils/custom_error.js";

async function getMerchantRate(prsma:Prisma.TransactionClient,merchantId: number): Promise<{
    disbursementRate: Decimal;
    disbursementWithHoldingTax: Decimal;
    disbursementGST: Decimal;
}> {
    console.log("Merchant Id: ",merchantId)
    const merchant = await prsma.merchantFinancialTerms.findFirst({
        where: { merchant_id: merchantId },
    });

    if (!merchant) {
        throw new CustomError('Merchant not found', 404);
    }

    return {disbursementRate: new Decimal(merchant.disbursementRate), disbursementGST: new Decimal(merchant.disbursementGST), disbursementWithHoldingTax: new Decimal(merchant.disbursementWithHoldingTax)};
}

const checkMerchantExists = async (merchantId: number): Promise<boolean> => {
    const merchant = await prisma.user.findUnique({
        where: { id: merchantId },
    });
    return Boolean(merchant);
};

const checkMerchantExistsWithKey = async (merchantId: string): Promise<boolean> => {
    const user = await prisma.merchant.findMany({
        where: { uid: merchantId },
    });

    return Boolean(user.length == 1);
};

const getEligibleTransactions = async (merchantId: number, prsm: Prisma.TransactionClient) => {
    const merchantExists = await checkMerchantExists(merchantId);
    if (!merchantExists) {
        throw new CustomError('Merchant not found', 404);
    }
    return prsm.transaction.findMany({
        where: {
            settlement: true,
            merchant_id: merchantId,
            balance: { gt: new Decimal(0) },
        },
        orderBy: {
            date_time: 'asc',
        },
        select: {
            transaction_id: true,
            settled_amount: true,
            balance: true,
            original_amount: true
        },
    });
};


const calculateWalletBalance = async (merchantId: number): Promise<Object> => {
    const result = await prisma.transaction.aggregate({
        _sum: {
            balance: true,
        },
        where: {
            settlement: true,
            balance: { gt: new Decimal(0) },
            merchant_id: merchantId,
            status: 'completed',
        },
    });

    // Find the todays transaction sum
    const servertodayStart = new Date().setHours(0, 0, 0, 0);
    const servertodayEnd = new Date().setHours(23, 59, 59, 999);

    const todayResult = await prisma.transaction.aggregate({
        _sum: {
            balance: true,
        },
        where: {
            settlement: true,
            balance: { gt: new Decimal(0) },
            merchant_id: merchantId,
            date_time: {
                gte: new Date(servertodayStart),
                lt: new Date(servertodayEnd),
            },
        },
    });
    const walletBalance = result._sum.balance || new Decimal(0);
    const todayBalance = todayResult._sum.balance || new Decimal(0);
    return {
        walletBalance: walletBalance.toNumber(),
        todayBalance: todayBalance.toNumber(),
    };
};

const calculateWalletBalanceWithKey = async (merchantId: string): Promise<Object> => {
    const merchant = await prisma.merchant.findFirst({
        where: { uid: merchantId },
    })
    const result = await prisma.transaction.aggregate({
        _sum: {
            balance: true,
        },
        where: {
            settlement: true,
            balance: { gt: new Decimal(0) },
            merchant_id: merchant?.merchant_id,
            status: 'completed'
        },
    });

    // Find the todays transaction sum
    const servertodayStart = new Date().setHours(0, 0, 0, 0);
    const servertodayEnd = new Date().setHours(23, 59, 59, 999);

    const todayResult = await prisma.transaction.aggregate({
        _sum: {
            balance: true,
        },
        where: {
            settlement: true,
            balance: { gt: new Decimal(0) },
            merchant_id: merchant?.merchant_id,
            date_time: {
                gte: new Date(servertodayStart),
                lt: new Date(servertodayEnd),
            },
        },
    });
    const walletBalance = result._sum.balance || new Decimal(0);
    const todayBalance = todayResult._sum.balance || new Decimal(0);
    return {
        walletBalance: walletBalance.toNumber(),
        todayBalance: todayBalance.toNumber(),
    };
};

const getWalletBalance = async (merchantId: number): Promise<Object> => {
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

const getWalletBalanceWithKey = async (merchantId: string): Promise<Object> => {
    try {
        // Check if the merchant exists
        const merchantExists = await checkMerchantExistsWithKey(merchantId);
        if (!merchantExists) {
            throw new CustomError('Merchant not found', 404);
        }

        // Calculate and return the wallet balance
        const walletBalance = await calculateWalletBalanceWithKey(merchantId);
        return walletBalance;
    } catch (error) {
        if (error instanceof CustomError) {
            throw error; // Re-throw custom errors with proper status codes
        }
        console.error('Error fetching wallet balance:', error);
        throw new CustomError('Unable to fetch wallet balance', 500);
    }
};
const getDisbursementBalanceWithKey = async (merchantId: string): Promise<Object> => {
    try {
        // Check if the merchant exists
        const merchantExists = await checkMerchantExistsWithKey(merchantId);
        if (!merchantExists) {
            throw new CustomError('Merchant not found', 404);
        }
        console.log(merchantId)
        // Calculate and return the wallet balance
        const walletBalance = await prisma.merchant.findFirst({
            where: {
              uid: merchantId,
            },
            select: {
              balanceToDisburse: true,
            }
          });

        if (walletBalance === null) {
            throw new CustomError('Wallet balance not found', 404);
        }

        console.log(walletBalance);
        return walletBalance;
    } catch (error) {
        if (error instanceof CustomError) {
            throw error; // Re-throw custom errors with proper status codes
        }
        console.error('Error fetching wallet balance:', error);
        throw new CustomError('Unable to fetch wallet balance', 500);
    }
};

const calculateDisbursement = (
    transactions: TransactionData[],
    amount: Decimal,
): { updates: TransactionUpdate[]; totalDisbursed: Decimal } => {
    const updates: TransactionUpdate[] = [];
    let totalDisbursed = new Decimal(0);

    for (const transaction of transactions) {
        if (totalDisbursed.greaterThanOrEqualTo(amount)) {
            break;
        }

        const availableAmount = transaction.balance;

        let disburseAmount = new Decimal(0);

        if (totalDisbursed.plus(availableAmount).lessThanOrEqualTo(amount)) {
            // Disburse the full available amount
            disburseAmount = availableAmount;
            totalDisbursed = totalDisbursed.plus(disburseAmount);
            updates.push({
                transaction_id: transaction.transaction_id,
                disbursed: true,
                balance: new Decimal(0),
            });
        } else {
            // Partially disburse the transaction
            disburseAmount = amount.minus(totalDisbursed);
            totalDisbursed = totalDisbursed.plus(disburseAmount);
            const remainingBalance = availableAmount.minus(disburseAmount);
            updates.push({
                transaction_id: transaction.transaction_id,
                disbursed: false,
                balance: remainingBalance,
            });
            break; // We've fulfilled the requested amount
        }
    }

    if (totalDisbursed.lessThan(amount)) {
        throw new CustomError('Insufficient funds to disburse the requested amount', 400);
    }

    return { updates, totalDisbursed };
};

const updateTransactions = async (updates: TransactionUpdate[], prsma: Prisma.TransactionClient) => {
    const updatePromises = updates.map((update) =>
        prsma.transaction.update({
            where: {
                transaction_id: update.transaction_id,
            },
            data: {
                balance: update.balance,
            },
        })
    );
    await Promise.all(updatePromises);
};
export { checkMerchantExists,checkMerchantExistsWithKey,calculateWalletBalance,calculateWalletBalanceWithKey,getWalletBalance, getEligibleTransactions, calculateDisbursement, updateTransactions, getMerchantRate, getWalletBalanceWithKey, getDisbursementBalanceWithKey };