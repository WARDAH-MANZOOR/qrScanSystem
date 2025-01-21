import { PrismaClient } from '@prisma/client';
import { Decimal, JsonObject } from '@prisma/client/runtime/library';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { transactionService } from 'services/index.js';
import { getWalletBalance } from 'services/paymentGateway/disbursement.js';
import CustomError from 'utils/custom_error.js';
import { addWeekdays } from 'utils/date_method.js';
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

async function adjustMerchantWalletBalance(merchantId: number, targetBalance: number, record: boolean, wb?: number) {
    try {
        // Get current balance
        let walletBalance;
        // if (!wb) {
        const balance = await getWalletBalance(merchantId) as { walletBalance: number };
        walletBalance = balance.walletBalance;
        // targetBalance += walletBalance;
        // }
        // else {
        // walletBalance = wb;
        // }
        if (walletBalance === 0) {
            throw new CustomError("Current balance is 0", 400);
        }
        console.log(targetBalance)
        console.log(targetBalance, walletBalance)
        console.log(targetBalance / walletBalance)


        const balanceDifference = targetBalance - walletBalance;
        const isSettlement = balanceDifference > 0;

        // Execute in transaction
        return await prisma.$transaction(async (tx) => {
            // Update transaction balances
            await tx.transaction.updateMany({
                where: {
                    merchant_id: merchantId,
                    status: 'completed',
                    settlement: true,
                    balance: { gt: 0 },
                },
                data: {
                    balance: { multiply: targetBalance / walletBalance }
                }
            });
            const currentTime = Date.now();
            const formattedDate = format(new Date(), 'yyyyMMddHHmmss');
            const fractionalMilliseconds = Math.floor(
                (currentTime - Math.floor(currentTime)) * 1000
            );
            const txnId = `T${formattedDate}${fractionalMilliseconds.toString()}${Math.random().toString(36).substr(2, 4)}`
            // Create appropriate record
            if (record) {
                if (isSettlement) {
                    await tx.settlementReport.create({
                        data: {
                            merchant_id: merchantId,
                            settlementDate: new Date(),
                            transactionAmount: Math.abs(balanceDifference),
                            merchantAmount: Math.abs(balanceDifference),
                            commission: 0,
                            gst: 0,
                            withholdingTax: 0,
                            transactionCount: 1
                        }
                    });
                } else {
                    await tx.disbursement.create({
                        data: {
                            merchant_id: merchantId,
                            disbursementDate: new Date(),
                            transactionAmount: Math.abs(balanceDifference),
                            merchantAmount: Math.abs(balanceDifference),
                            commission: 0,
                            gst: 0,
                            withholdingTax: 0,
                            status: 'completed',
                            response_message: 'Wallet adjustment',
                            merchant_custom_order_id: txnId,
                            system_order_id: txnId
                        }
                    });
                }
            }
            return {
                success: true,
                type: isSettlement ? 'settlement' : 'disbursement',
                previousBalance: walletBalance,
                newBalance: targetBalance,
                difference: Math.abs(balanceDifference)
            };
        });

    } catch (error) {
        throw new CustomError(
            error instanceof Error ? error.message : 'Failed to adjust wallet balance',
            500
        );
    }
}

async function adjustMerchantDisbursementWalletBalance(merchantId: number, targetBalance: number, record: boolean, wb?: number) {
    try {
        // Get current balance
        let walletBalance;
        // if (!wb) {
        const balance = await getWalletBalance(merchantId) as { walletBalance: number };
        walletBalance = balance.walletBalance;
        targetBalance += walletBalance;
        // }
        // else {
        // walletBalance = wb;
        // }
        if (walletBalance === 0) {
            throw new CustomError("Current balance is 0", 400);
        }
        console.log(targetBalance)
        console.log(targetBalance, walletBalance)
        console.log(targetBalance / walletBalance)


        const balanceDifference = targetBalance - walletBalance;
        const isSettlement = balanceDifference > 0;

        // Execute in transaction
        return await prisma.$transaction(async (tx) => {
            // Update transaction balances
            await tx.transaction.updateMany({
                where: {
                    merchant_id: merchantId,
                    status: 'completed',
                    settlement: true,
                    balance: { gt: 0 },
                },
                data: {
                    balance: { multiply: targetBalance / walletBalance }
                }
            });
            const currentTime = Date.now();
            const formattedDate = format(new Date(), 'yyyyMMddHHmmss');
            const fractionalMilliseconds = Math.floor(
                (currentTime - Math.floor(currentTime)) * 1000
            );
            const txnId = `T${formattedDate}${fractionalMilliseconds.toString()}${Math.random().toString(36).substr(2, 4)}`
            // Create appropriate record
            if (record) {
                if (isSettlement) {
                    await tx.settlementReport.create({
                        data: {
                            merchant_id: merchantId,
                            settlementDate: new Date(),
                            transactionAmount: Math.abs(balanceDifference),
                            merchantAmount: Math.abs(balanceDifference),
                            commission: 0,
                            gst: 0,
                            withholdingTax: 0,
                            transactionCount: 1
                        }
                    });
                } else {
                    await tx.disbursement.create({
                        data: {
                            merchant_id: merchantId,
                            disbursementDate: new Date(),
                            transactionAmount: Math.abs(balanceDifference),
                            merchantAmount: Math.abs(balanceDifference),
                            commission: 0,
                            gst: 0,
                            withholdingTax: 0,
                            status: 'completed',
                            response_message: 'Wallet adjustment',
                            merchant_custom_order_id: txnId,
                            system_order_id: txnId
                        }
                    });
                }
            }
            return {
                success: true,
                type: isSettlement ? 'settlement' : 'disbursement',
                previousBalance: walletBalance,
                newBalance: targetBalance,
                difference: Math.abs(balanceDifference)
            };
        });

    } catch (error) {
        throw new CustomError(
            error instanceof Error ? error.message : 'Failed to adjust wallet balance',
            500
        );
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
        const merchant = await prisma.merchantFinancialTerms.findFirst({
            where: {
                merchant_id: Number(merchantId)
            }
        })
        // Step 1: Fetch transactions to be settled
        const merchantTxns = await prisma.transaction.findMany({
            where: {
                merchant_id: merchantId,
                settlement: false,
                balance: { gt: 0 },
                status: 'completed',
            },
        });

        // Step 2: Perform calculations
        const transactionCount = merchantTxns.length;
        const transactionAmount = merchantTxns.reduce(
            (sum, txn) => sum.plus(txn?.original_amount ?? new Decimal(0)),
            new Decimal(0)
        );
        const totalCommission = transactionAmount.times(merchant?.commissionRate ?? 0);
        const totalGST = totalCommission.times(merchant?.commissionGST ?? 0);
        const totalWithholdingTax = transactionAmount.times(merchant?.commissionWithHoldingTax ?? 0);
        const merchantAmount = transactionAmount
            .minus(totalCommission)
            .minus(totalGST)
            .minus(totalWithholdingTax);

        // Step 3: Update transactions to mark them as settled
        const updateResult = await prisma.transaction.updateMany({
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

        const today = new Date();

        // Upsert the settlement report
        await prisma.settlementReport.create({
            data: {
                merchant_id: merchantId,
                settlementDate: today,
                transactionCount,
                transactionAmount,
                commission: totalCommission,
                gst: totalGST,
                withholdingTax: totalWithholdingTax,
                merchantAmount,
            }
        });
        return 'All merchant transactions settled successfully.';
    } catch (error) {
        console.log(error)
        throw new CustomError('Error settling all transactions', 500);
    }
}

const createTransactionService = async (body: any, merchant_id: string) => {
    try {
        const merchant = await prisma.merchantFinancialTerms.findUnique({
            where: { merchant_id: parseInt(merchant_id) },
        });
        // Calculate Settlement Values
        const commission = (Number(merchant?.commissionRate) ?? 1) * body.original_amount;
        const gst = (Number(merchant?.commissionGST) ?? 1) * body.original_amount;
        const withholdingTax = (Number(merchant?.commissionWithHoldingTax) ?? 1) * body.original_amount; // Example: 10% withholding tax
        const merchantAmount = body.original_amount - commission - gst - withholdingTax;
        const today = new Date();
        const settlementDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const formattedDate = format(new Date(), 'yyyyMMddHHmmss');
        const currentTime = Date.now();
        const fractionalMilliseconds = Math.floor(
            (currentTime - Math.floor(currentTime)) * 1000
        );
        const txnRefNo = `T${formattedDate}${fractionalMilliseconds.toString()}${Math.random().toString(36).substr(2, 4)}`
        return await prisma.$transaction(async (tx) => {
            // Create Transaction
            const transaction = await tx.transaction.create({
                data: {
                    transaction_id: txnRefNo,
                    merchant_transaction_id: txnRefNo,
                    merchant_id: Number(merchant_id),
                    original_amount: body.original_amount,
                    status: "completed",
                    type: "wallet",
                    date_time: new Date(),
                    settlement: body.settlement,
                    balance: merchantAmount,
                    providerDetails: {
                        name: body.provider_name,
                        msisdn: body.provider_account,
                    },
                    response_message: "success",
                },
            });
            // Update or Create SettlementReport

            const settlement = await tx.settlementReport.upsert({
                where: {
                    merchant_id_settlementDate: {
                        merchant_id: Number(merchant_id),
                        settlementDate,
                    },
                },
                update: {
                    transactionCount: { increment: 1 },
                    transactionAmount: { increment: body.original_amount },
                    commission: { increment: commission },
                    gst: { increment: gst },
                    withholdingTax: { increment: withholdingTax },
                    merchantAmount: { increment: merchantAmount },
                },
                create: {
                    merchant_id: Number(merchant_id),
                    settlementDate,
                    transactionCount: 1,
                    transactionAmount: body.original_amount,
                    commission,
                    gst,
                    withholdingTax,
                    merchantAmount,
                },
            });
            if (!body.settlement) {
                const scheduledAt = addWeekdays(
                    new Date(),
                    merchant?.settlementDuration as number
                ); // Call the function to get the next 2 weekdays
                let scheduledTask = await tx.scheduledTask.create({
                    data: {
                        transactionId: txnRefNo,
                        status: "pending",
                        scheduledAt: scheduledAt, // Assign the calculated weekday date
                        executedAt: null, // Assume executedAt is null when scheduling
                    },
                });
            }
            return { transaction, settlement };
        })

    }
    catch (err) {
        return err;
    }
}

async function deleteMerchantData(merchantId: number) {
    try {
        await prisma.$transaction(async (tx) => {
            // Delete all dependent data
            await tx.userGroup.deleteMany({
                where: { merchantId },
            });

            await tx.merchantFinancialTerms.deleteMany({
                where: { merchant_id: merchantId },
            });

            await tx.merchantProviderCredential.deleteMany({
                where: { merchant_id: merchantId },
            });

            await tx.disbursement.deleteMany({
                where: { merchant_id: merchantId },
            });

            await tx.settlementReport.deleteMany({
                where: { merchant_id: merchantId },
            });

            await tx.transaction.deleteMany({
                where: { merchant_id: merchantId },
            });

            // Finally, delete the merchant
            await tx.merchant.delete({
                where: { merchant_id: merchantId },
            });

            await tx.user.delete({
                where: { id: merchantId },
            })
        }, {
            timeout: 10000
        });

        console.log(`Merchant with ID ${merchantId} and all related data have been deleted.`);
    } catch (error) {
        console.error(`Error deleting merchant with ID ${merchantId}:`, error);
    } finally {
        await prisma.$disconnect();
    }
}

async function payinCallback(orderIds: string[]) {
    const txns = await prisma.transaction.findMany({
        where: {
            merchant_transaction_id: { in: orderIds }
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
    console.log(transactionsByMerchant)
    for (const merchantId in transactionsByMerchant) {
        const merchant = await prisma.merchant.findFirst({
            where: {
                merchant_id: Number(merchantId)
            }
        })
        const merchantTxns = transactionsByMerchant[merchantId];
        for (const txn of merchantTxns) {
            console.log(merchant?.webhook_url)
            await transactionService.sendCallback(
                merchant?.webhook_url as string,
                txn,
                (txn.providerDetails as JsonObject)?.account as string,
                "payin",
                merchant?.encrypted == "True" ? true : false,
                false
            )
        }
    }
}

async function payoutCallback(orderIds: string[]) {
    const txns = await prisma.disbursement.findMany({
        where: {
            merchant_custom_order_id: { in: orderIds }
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
    console.log(transactionsByMerchant)
    for (const merchantId in transactionsByMerchant) {
        const merchant = await prisma.merchant.findFirst({
            where: {
                merchant_id: Number(merchantId)
            }
        })
        const merchantTxns = transactionsByMerchant[merchantId];
        for (const txn of merchantTxns) {
            console.log(merchant?.webhook_url)
            await transactionService.sendCallback(
                merchant?.webhook_url as string,
                {original_amount: txn.transactionAmount, date_time: txn.disbursementDate, merchant_transaction_id: txn.merchant_custom_order_id, merchant_id: txn.merchant_id},
                (txn as unknown as JsonObject)?.account as string,
                "payout",
                merchant?.encrypted == "True" ? true : false,
                false
            )
        }
    }
}


export default {
    adjustMerchantWalletBalance,
    checkMerchantTransactionStats,
    removeMerchantFinanceData,
    settleAllMerchantTransactions,
    settleTransactions,
    zeroMerchantWalletBalance,
    createTransactionService,
    deleteMerchantData,
    adjustMerchantDisbursementWalletBalance,
    payinCallback,
    payoutCallback
}