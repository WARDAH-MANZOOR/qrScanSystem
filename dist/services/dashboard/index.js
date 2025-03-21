import { subDays, parse } from "date-fns";
import prisma from "../../prisma/client.js";
import CustomError from "../../utils/custom_error.js";
import { getWalletBalance } from "../../services/paymentGateway/disbursement.js";
import { toZonedTime } from "date-fns-tz";
import { Decimal } from "@prisma/client/runtime/library";
const merchantDashboardDetails = async (params, user) => {
    try {
        const merchantId = user?.merchant_id || params?.merchantId;
        if (!merchantId) {
            throw new CustomError("Merchant ID is required", 400);
        }
        const currentDate = new Date();
        let filters = { merchant_id: merchantId };
        try {
            const startDate = params?.start?.replace(" ", "+");
            const endDate = params?.end?.replace(" ", "+");
            const customWhere = {};
            let disbursement_date;
            let usdt_settlement_date;
            if (startDate && endDate) {
                const todayStart = parse(startDate, "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
                const todayEnd = parse(endDate, "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
                customWhere["date_time"] = {
                    gte: todayStart,
                    lt: todayEnd,
                };
                disbursement_date = customWhere["date_time"];
                usdt_settlement_date = customWhere["date_time"];
            }
            const fetchAggregates = [];
            // Fetch total transaction count
            fetchAggregates.push(prisma.transaction.count({
                where: {
                    merchant_id: +merchantId,
                    ...customWhere,
                },
            }) // Return type is a Promise<number>
            );
            // fetch sum of original amount from transactions
            fetchAggregates.push(prisma.transaction
                .aggregate({
                _sum: { original_amount: true },
                where: {
                    status: "completed",
                    merchant_id: +merchantId,
                    ...customWhere,
                },
            })
                .catch((error) => {
                throw new CustomError(error?.message, 500);
            }) // Properly type the aggregate query
            );
            //Fetch today's transaction sum
            // const servertodayStart = new Date().setHours(0, 0, 0, 0);
            // const servertodayEnd = new Date().setHours(23, 59, 59, 999);
            const date = new Date();
            // Define the Pakistan timezone
            // const timeZone = 'Asia/Karachi';
            // // Convert the date to the Pakistan timezone
            // const zonedDate = toZonedTime(date, timeZone);
            const servertodayStart = date.setHours(0, 0, 0, 0);
            const servertodayEnd = date.setHours(23, 59, 59, 999);
            console.log(date);
            fetchAggregates.push(prisma.transaction.aggregate({
                _sum: { original_amount: true },
                where: {
                    date_time: {
                        gte: new Date(servertodayStart),
                        lt: new Date(servertodayEnd),
                    },
                    merchant_id: +merchantId,
                    status: "completed"
                },
            }) // Properly type the aggregate query
            );
            // Fetch transaction status count
            fetchAggregates.push(prisma.transaction.groupBy({
                where: { merchant_id: +merchantId, ...customWhere },
                by: ["status"],
                _count: { status: true },
                orderBy: {
                    status: "asc", // Ensure the result is ordered by status or any other field
                },
            }) // Properly type the groupBy query
            );
            fetchAggregates.push(prisma.transaction.findMany({
                take: 10,
                orderBy: {
                    date_time: "desc",
                },
                where: {
                    merchant_id: +merchantId,
                    ...customWhere,
                },
            }));
            // count transaction of this week and last week
            const lastWeekStart = subDays(currentDate, 7);
            const lastWeekEnd = new Date(currentDate.setHours(0, 0, 0, 0)); // End of last week is start of today
            const thisWeekStart = new Date(currentDate.setHours(0, 0, 0, 0)); // Start of this week is start of today
            const thisWeekEnd = new Date();
            // Fetch last week's transaction sum
            fetchAggregates.push(prisma.transaction.aggregate({
                _sum: { original_amount: true },
                where: {
                    date_time: {
                        gte: lastWeekStart,
                        lt: lastWeekEnd,
                    },
                    merchant_id: +merchantId,
                    status: "completed"
                },
            }) // Properly type the aggregate query
            );
            // Fetch this week's transaction sum
            fetchAggregates.push(prisma.transaction.aggregate({
                _sum: { original_amount: true },
                where: {
                    date_time: {
                        gte: thisWeekStart,
                        lt: thisWeekEnd,
                    },
                    merchant_id: +merchantId,
                    status: "completed"
                },
            }) // Properly type the aggregate query
            );
            // Fetch the sum of all jazzcash and easypaisa transactions within the customWhere range
            fetchAggregates.push(prisma.transaction.aggregate({
                _sum: { original_amount: true },
                _count: { original_amount: true },
                where: {
                    ...customWhere,
                    merchant_id: +merchantId,
                    status: "completed",
                    providerDetails: {
                        path: ['name'],
                        equals: 'JazzCash'
                    },
                },
            }) // Properly type the aggregate query
            );
            fetchAggregates.push(prisma.transaction.aggregate({
                _sum: { original_amount: true },
                _count: { original_amount: true },
                where: {
                    ...customWhere,
                    merchant_id: +merchantId,
                    status: "completed",
                    providerDetails: {
                        path: ['name'],
                        equals: 'Easypaisa'
                    },
                },
            }) // Properly type the aggregate query
            );
            fetchAggregates.push(prisma.merchant.findFirst({
                where: {
                    merchant_id: +merchantId,
                },
                select: {
                    balanceToDisburse: true,
                    disburseBalancePercent: true
                }
            })
                .then((result) => (result?.balanceToDisburse?.toNumber() || 0)) // Properly type the aggregate query
                .catch((err) => {
                console.error(err);
                throw new CustomError("Unable to get balance to disburse", 500);
            }));
            fetchAggregates.push(prisma.merchant.findFirst({
                where: {
                    merchant_id: +merchantId,
                },
                select: {
                    disburseBalancePercent: true
                }
            })
                .then((result) => (result?.disburseBalancePercent?.toNumber() || 0)) // Properly type the aggregate query
                .catch((err) => {
                console.error(err);
                throw new CustomError("Unable to get balance to disburse", 500);
            }));
            fetchAggregates.push(prisma.disbursement.aggregate({
                _sum: {
                    transactionAmount: true,
                },
                where: {
                    disbursementDate: disbursement_date,
                    status: "completed",
                    merchant_id: +merchantId,
                }
            }));
            fetchAggregates.push(prisma.uSDTSettlement.aggregate({
                _sum: {
                    pkr_amount: true,
                },
                where: {
                    date: usdt_settlement_date,
                    merchant_id: +merchantId,
                }
            }));
            fetchAggregates.push(prisma.transaction.aggregate({
                _sum: {
                    original_amount: true
                },
                where: {
                    settlement: false,
                    status: 'completed',
                    merchant_id: +merchantId,
                    ScheduledTask: {
                        status: 'pending'
                    }
                }
            }));
            fetchAggregates.push(prisma.refund.aggregate({
                _sum: {
                    transactionAmount: true,
                },
                where: {
                    disbursementDate: disbursement_date,
                    status: "completed",
                    merchant_id: +merchantId,
                }
            }));
            // Execute all queries in parallel
            const [totalTransactions, totalIncome, todayIncome, statusCounts, latestTransactions, lastWeek, thisWeek, jazzCashTotal, easyPaisaTotal, disbursementBalance, disburseBalancePercent, disbursementAmount, totalUsdtSettlement, remainingSettlements, totalRefund] = await Promise.all(fetchAggregates);
            let amt = disbursementAmount._sum.transactionAmount?.toFixed(2) || 0;
            // Build and return the full dashboard summary
            const dashboardSummary = {
                totalTransactions: totalTransactions, // Ensure correct type
                totalIncome: totalIncome._sum
                    ?.original_amount || 0,
                todayIncome: todayIncome._sum
                    ?.original_amount || 0,
                statusCounts: statusCounts || [],
                latestTransactions: latestTransactions,
                availableBalance: 0,
                disbursementBalance: disbursementBalance,
                disburseBalancePercent,
                disbursementAmount: amt,
                totalUsdtSettlement: totalUsdtSettlement._sum.pkr_amount || 0,
                remainingSettlements: remainingSettlements._sum.original_amount || 0,
                totalRefund: totalRefund._sum.transactionAmount?.toFixed(2) || 0,
                transactionSuccessRate: 0,
                lastWeek: lastWeek._sum
                    ?.original_amount || 0,
                thisWeek: thisWeek._sum
                    ?.original_amount || 0,
                jazzCashTotal: jazzCashTotal._sum
                    ?.original_amount || 0,
                jazzCashCount: jazzCashTotal._count
                    ?.original_amount || 0,
                easyPaisaTotal: easyPaisaTotal._sum
                    ?.original_amount || 0,
                easyPaisaCount: easyPaisaTotal._count
                    ?.original_amount || 0,
            };
            const walletBalance = await getWalletBalance(+merchantId);
            // @ts-ignore
            dashboardSummary.availableBalance = walletBalance?.walletBalance || 0;
            // Calculate the transaction success rate
            dashboardSummary.transactionSuccessRate =
                await getTransactionsSuccessRate(statusCounts);
            // make sure we sending three status always in response completed, failed, pending
            const statusTypes = ["completed", "pending", "failed"];
            // @ts-ignore
            const statusCountsMap = statusCounts.reduce((acc, item) => {
                acc[item.status] = item._count.status;
                return acc;
            }, {});
            dashboardSummary.statusCounts = statusTypes.map((status) => ({
                status,
                count: statusCountsMap[status] || 0,
            }));
            return dashboardSummary;
        }
        catch (error) {
            console.error(error);
            return error;
        }
    }
    catch (error) {
        throw new CustomError(error?.error, error?.statusCode);
    }
};
const adminDashboardDetails = async (params) => {
    try {
        const currentDate = new Date();
        const startDate = params?.start?.replace(" ", "+");
        const endDate = params?.end?.replace(" ", "+");
        const customWhere = {};
        let disbursement_date;
        let settlement_date;
        let usdt_settlement_date;
        if (startDate && endDate) {
            const todayStart = parse(startDate, "yyyy-MM-dd'T'HH:mm:ssXXX", startDate);
            const todayEnd = parse(endDate, "yyyy-MM-dd'T'HH:mm:ssXXX", endDate);
            customWhere["date_time"] = {
                gte: todayStart,
                lt: todayEnd,
            };
            disbursement_date = customWhere["date_time"];
            settlement_date = customWhere["date_time"];
            usdt_settlement_date = customWhere["date_time"];
        }
        const fetchAggregates = [];
        // Fetch total number of merchants
        fetchAggregates.push(prisma.merchant.count());
        console.log(customWhere);
        // Fetch sum of original_amount from transactions
        fetchAggregates.push(prisma.transaction.aggregate({
            _sum: { original_amount: true },
            where: {
                status: "completed",
                ...customWhere,
            },
        }) // Properly type the aggregate query
        );
        const date = new Date();
        // Define the Pakistan timezone
        const timeZone = 'Asia/Karachi';
        // Convert the date to the Pakistan timezone
        const zonedDate = toZonedTime(date, timeZone);
        const servertodayStart = new Date(zonedDate.setHours(0, 0, 0, 0));
        const servertodayEnd = new Date(zonedDate.setHours(23, 59, 59, 999));
        console.log(servertodayStart, servertodayEnd);
        // Fetch sum of original_amount from today's transactions
        fetchAggregates.push(prisma.transaction
            .aggregate({
            _sum: { original_amount: true },
            where: {
                date_time: {
                    gte: new Date(servertodayStart),
                    lte: new Date(servertodayEnd),
                },
                status: "completed",
            },
        })
            .catch((error) => {
            throw new CustomError(error?.message, 500);
        }) // Properly type the aggregate query
        );
        // bring latest 10 transactions
        fetchAggregates.push(prisma.transaction.findMany({
            take: 10,
            orderBy: {
                date_time: "desc",
            },
            where: {
                ...customWhere,
            },
            include: {
                Provider: true
            }
        }));
        fetchAggregates.push(prisma.merchant.aggregate({
            _sum: {
                balanceToDisburse: true
            }
        }));
        fetchAggregates.push(prisma.disbursement.aggregate({
            _sum: {
                transactionAmount: true,
            },
            where: {
                disbursementDate: disbursement_date,
                status: "completed",
            }
        }));
        fetchAggregates.push(prisma.transaction.aggregate({
            _sum: {
                balance: true
            },
            where: {
                settlement: true,
                balance: { gt: new Decimal(0) },
                status: "completed"
            },
        }));
        fetchAggregates.push(prisma.settlementReport.aggregate({
            _sum: {
                merchantAmount: true
            },
            where: {
                settlementDate: settlement_date,
            }
        }));
        fetchAggregates.push(prisma.uSDTSettlement.aggregate({
            _sum: {
                pkr_amount: true,
            },
            where: {
                date: usdt_settlement_date,
            }
        }));
        fetchAggregates.push(prisma.transaction.aggregate({
            _sum: {
                original_amount: true
            },
            where: {
                settlement: false,
                status: 'completed',
                ScheduledTask: {
                    status: 'pending'
                }
            }
        }));
        fetchAggregates.push(prisma.refund.aggregate({
            _sum: {
                transactionAmount: true,
            },
            where: {
                disbursementDate: disbursement_date,
                status: "completed",
            }
        }));
        // Execute all queries in parallel
        const [totalMerchants, totalIncome, todayIncome, latestTransactions, totalBalanceToDisburse, totalDisbursmentAmount, totalSettlementBalance, totalSettlementAmount, totalUsdtSettlement, remainingSettlements, totalRefund] = await Promise.all(fetchAggregates);
        // Build and return the full dashboard summary
        const dashboardSummary = {
            totalMerchants: totalMerchants, // Ensure correct type
            totalIncome: totalIncome._sum
                ?.original_amount || 0,
            todayIncome: todayIncome._sum
                ?.original_amount || 0,
            latestTransactions: latestTransactions,
            totalBalanceToDisburse: totalBalanceToDisburse._sum.balanceToDisburse || 0,
            totalDisbursmentAmount: totalDisbursmentAmount._sum.transactionAmount?.toFixed(2) || 0,
            totalSettlementBalance: totalSettlementBalance._sum.balance?.toFixed(2) || 0,
            totalSettlementAmount: totalSettlementAmount._sum.merchantAmount?.toFixed(2) || 0,
            totalUsdtSettlement: totalUsdtSettlement._sum.pkr_amount || 0,
            remainingSettlements: remainingSettlements._sum.original_amount || 0,
            totalRefund: totalRefund._sum.transactionAmount?.toFixed(2) || 0
        };
        return dashboardSummary;
    }
    catch (error) {
        throw new CustomError(error?.error, error?.statusCode);
    }
};
const getTransactionsSuccessRate = async (statusCounts) => {
    // On Basis of statusCounts generate a transaction success rate
    // 1. Find the total number of transactions
    const totalTransactions = statusCounts.reduce((acc, item) => acc + item._count.status, 0);
    // 2. Find the number of successful transactions
    const successfulTransactions = statusCounts.find((item) => item.status === "completed")?._count.status;
    // 3. Calculate the success rate
    return totalTransactions
        ? ((successfulTransactions || 0) / totalTransactions) * 100
        : 0;
};
export default {
    merchantDashboardDetails,
    adminDashboardDetails,
    getTransactionsSuccessRate,
};
