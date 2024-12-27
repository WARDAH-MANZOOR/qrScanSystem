import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { toZonedTime } from 'date-fns-tz';
import { getWalletBalance } from 'services/paymentGateway/disbursement.js';
import CustomError from 'utils/custom_error.js';
const prisma = new PrismaClient();

// Delete all finance data for a merchant
async function removeMerchantFinanceData(merchantId: number) {
    try {
        // Delete from ScheduledTask
        await prisma.scheduledTask.deleteMany({
            where: {
                transactionId: {
                    in: (await prisma.transaction.findMany({
                        where: { merchant_id: merchantId },
                        select: { transaction_id: true },
                    })).map((obj) => obj.transaction_id),
                },
            },
        });

        // Delete from SettlementReport
        await prisma.settlementReport.deleteMany({ where: { merchant_id: merchantId } });

        // Delete from Disbursement
        await prisma.disbursement.deleteMany({ where: { merchant_id: merchantId } });

        // Delete Transactions
        await prisma.transaction.deleteMany({ where: { merchant_id: merchantId } });

        return 'Merchant finance data removed successfully.';
    } catch (error) {
        throw new CustomError('Error removing merchant finance data', 500);
    }
}

async function zeroMerchantWalletBalance(merchantId: number) {
    try {
        await prisma.transaction.updateMany({
            where: {
                merchant_id: merchantId,
                status: 'completed',
            },
            data: {
                balance: 0,
            },
        });

        return 'Wallet balance zeroed successfully.';
    } catch (error) {
        throw new CustomError('Error zeroing wallet balance', 500);
    }
}

async function adjustMerchantWalletBalance(merchantId: number, factor: number) {
    try {
        const { walletBalance } = await getWalletBalance(merchantId) as { walletBalance: number };
        if (walletBalance > 0) {
            factor /= walletBalance;
        }
        else {
            throw new CustomError("Balance is 0", 500);
        }
        await prisma.transaction.updateMany({
            where: {
                merchant_id: merchantId,
                status: 'completed',
                settlement: true,
                balance: { gt: 0 },
            },
            data: {
                balance: {
                    multiply: factor,
                },
            },
        });

        return 'Wallet balance adjusted successfully.';
    } catch (error: any) {
        throw new CustomError(error.message || 'Error adjusting wallet balance', error.statusCode || 500);
    }
}

async function checkMerchantTransactionStats(merchantId: number) {
    try {
        const stats = await prisma.transaction.aggregate({
            _count: true,
            _sum: { balance: true },
            where: {
                merchant_id: merchantId,
                status: 'completed',
                settlement: true,
                balance: { gt: 0 },
            },
        });

        console.log('Merchant Transaction Stats:', stats);
        return stats;
    } catch (error) {
        throw new CustomError('Error fetching transaction stats', 500);
    }
}

async function settleTransactions(transactionIds: string[]) {
    try {
        const txns = await prisma.transaction.findMany({
            where: {
                transaction_id: { in: transactionIds }
            }
        });
        if (txns.length <= 0) {
            throw new CustomError("Transactions not found", 404);
        }

        // Group transactions by merchant
        const transactionsByMerchant = txns.reduce((acc, txn) => {
            if (!acc[txn.merchant_id]) {
                acc[txn.merchant_id] = [];
            }
            acc[txn.merchant_id].push(txn);
            return acc;
        }, {} as Record<number, typeof txns>);

        // Process each merchant's transactions
        for (const merchantId in transactionsByMerchant) {
            const merchantTxns = transactionsByMerchant[merchantId];

            const merchant = await prisma.merchantFinancialTerms.findUnique({
                where: { merchant_id: parseInt(merchantId) },
            });

            if (!merchant) {
                throw new CustomError(`Merchant with ID ${merchantId} not found`, 404);
            }

            await prisma.transaction.updateMany({
                where: {
                    transaction_id: { in: merchantTxns.map(txn => txn.transaction_id) },
                },
                data: {
                    settlement: true,
                    status: "completed",
                    response_message: "success"
                },
            });

            // Aggregate data for the settlement report
            const transactionCount = merchantTxns.length;
            const transactionAmount = merchantTxns.reduce((sum, txn) => sum.plus(txn?.original_amount ?? 0), new Decimal(0));
            const totalCommission = transactionAmount.times(merchant.commissionRate ?? 0);
            const totalGST = totalCommission.times(merchant.commissionGST ?? 0);
            const totalWithholdingTax = transactionAmount.times(merchant.commissionWithHoldingTax ?? 0);
            const merchantAmount = transactionAmount.minus(totalCommission).minus(totalGST).minus(totalWithholdingTax);

            const today = new Date();
            const settlementDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

            // Upsert the settlement report
            await prisma.settlementReport.upsert({
                where: {
                    merchant_id_settlementDate: {
                        merchant_id: parseInt(merchantId),
                        settlementDate,
                    },
                },
                create: {
                    merchant_id: parseInt(merchantId),
                    settlementDate,
                    transactionCount,
                    transactionAmount,
                    commission: totalCommission,
                    gst: totalGST,
                    withholdingTax: totalWithholdingTax,
                    merchantAmount,
                },
                update: {
                    transactionCount: { increment: transactionCount },
                    transactionAmount: { increment: transactionAmount },
                    commission: { increment: totalCommission },
                    gst: { increment: totalGST },
                    withholdingTax: { increment: totalWithholdingTax },
                    merchantAmount: { increment: merchantAmount },
                },
            });
        }

        return 'Transactions settled successfully.';
    } catch (error: any) {
        throw new CustomError(error.message || 'Error settling transactions', error.statusCode || 500);
    }
}

async function settleAllMerchantTransactions(merchantId: number) {
    try {
        await prisma.transaction.updateMany({
            where: {
                merchant_id: merchantId,
                settlement: false,
                balance: { gt: 0 },
                status: 'completed',
            },
            data: {
                settlement: true,
            },
        });

        return 'All merchant transactions settled successfully.';
    } catch (error) {
        throw new CustomError('Error settling all transactions', 500);
    }
}

export default {
    adjustMerchantWalletBalance,
    checkMerchantTransactionStats,
    removeMerchantFinanceData,
    settleAllMerchantTransactions,
    settleTransactions,
    zeroMerchantWalletBalance
}