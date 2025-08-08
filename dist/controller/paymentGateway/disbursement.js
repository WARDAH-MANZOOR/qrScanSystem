import { Decimal } from "@prisma/client/runtime/library";
import { validationResult } from "express-validator";
import prisma from "../../prisma/client.js";
import { calculateDisbursement, getDisbursementBalanceWithKey, getEligibleTransactions, getMerchantRate, getWalletBalance, getWalletBalanceWithKey, updateTransactions, } from "../../services/paymentGateway/disbursement.js";
import ApiResponse from "../../utils/ApiResponse.js";
import CustomError from "../../utils/custom_error.js";
const getWalletBalanceController = async (req, res, next) => {
    const merchant_id = req.user?.merchant_id;
    if (!merchant_id) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    try {
        const balance = await getWalletBalance(merchant_id);
        res.status(200).json(ApiResponse.success({ ...balance }));
    }
    catch (error) {
        next(error); // Pass the error to the error handling middleware
    }
};
// const getAllMerchantsWalletBalancesController = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     console.time("getAllMerchantsWalletBalances");
//     const { startDate, endDate } = req.query;
//     const start = startDate ? new Date(startDate as string) : null;
//     const end = endDate ? new Date(endDate as string) : null;
//     const [merchants, allWalletBalances, allDateRangeBalances] = await Promise.all([
//       prisma.merchant.findMany({
//         select: {
//           merchant_id: true,
//           uid: true,
//           user_id: true,
//           full_name: true,
//           company_name: true,
//         },
//       }),
//       prisma.transaction.groupBy({
//         by: ["merchant_id"],
//         where: {
//           settlement: true,
//           status: "completed",
//           balance: { gt: new Decimal(0) },
//         },
//         _sum: { balance: true },
//       }),
//       start && end
//         ? prisma.transaction.groupBy({
//             by: ["merchant_id"],
//             where: {
//               settlement: true,
//               status: "completed",
//               balance: { gt: new Decimal(0) },
//               date_time: {
//                 gte: start,
//                 lte: end,
//               },
//             },
//             _sum: { balance: true },
//           })
//         : Promise.resolve([]),
//     ]);
//     const walletMap = new Map(allWalletBalances.map(b => [b.merchant_id, b._sum.balance?.toNumber() || 0]));
//     const dateRangeMap = new Map(allDateRangeBalances.map(b => [b.merchant_id, b._sum.balance?.toNumber() || 0]));
//     const balances = merchants.map((merchant) => ({
//       merchantId: merchant.merchant_id,
//       uid: merchant.uid,
//       userId: merchant.user_id,
//       UserName: merchant.full_name,
//       companyName: merchant.company_name,
//       walletBalance: walletMap.get(merchant.merchant_id) || 0,
//       ...(start && end ? { dateRangeBalance: dateRangeMap.get(merchant.merchant_id) || 0 } : {}),
//     }));
//     balances.sort((a, b) => b.walletBalance - a.walletBalance);
//     console.timeEnd("getAllMerchantsWalletBalances");
//     res.status(200).json(ApiResponse.success(balances));
//   } catch (error) {
//     next(error);
//   }
// };
const getAllMerchantsWalletBalancesController = async (req, res, next) => {
    try {
        console.time("getAllMerchantsWalletBalances");
        const { startDate, endDate } = req.query;
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        // Calculate today's date range for income calculation
        const date = new Date();
        const todayStart = date.setHours(0, 0, 0, 0);
        const todayEnd = date.setHours(23, 59, 59, 999);
        const [merchants, allWalletBalances, allTodayIncome] = await Promise.all([
            prisma.merchant.findMany({
                select: {
                    merchant_id: true,
                    uid: true,
                    user_id: true,
                    full_name: true,
                    company_name: true,
                },
            }),
            prisma.transaction.groupBy({
                by: ["merchant_id"],
                where: {
                    settlement: true,
                    status: "completed",
                    balance: { gt: new Decimal(0) },
                    ...(start && end
                        ? {
                            date_time: {
                                gte: start,
                                lte: end,
                            },
                        }
                        : {}),
                },
                _sum: { balance: true },
            }),
            prisma.transaction.groupBy({
                by: ["merchant_id"],
                where: {
                    status: "completed",
                    date_time: {
                        gte: new Date(todayStart),
                        lte: new Date(todayEnd),
                    },
                },
                _sum: { original_amount: true },
            }),
        ]);
        const walletMap = new Map(allWalletBalances.map((b) => [b.merchant_id, b._sum.balance?.toNumber() || 0]));
        const todayIncomeMap = new Map(allTodayIncome.map((b) => [b.merchant_id, b._sum.original_amount?.toNumber() || 0]));
        const balances = merchants.map((merchant) => ({
            merchantId: merchant.merchant_id,
            uid: merchant.uid,
            userId: merchant.user_id,
            UserName: merchant.full_name,
            companyName: merchant.company_name,
            walletBalance: walletMap.get(merchant.merchant_id) || 0,
            todayIncome: todayIncomeMap.get(merchant.merchant_id) || 0,
        }));
        balances.sort((a, b) => b.walletBalance - a.walletBalance);
        console.timeEnd("getAllMerchantsWalletBalances");
        res.status(200).json(ApiResponse.success(balances));
    }
    catch (error) {
        next(error);
    }
};
const getWalletBalanceControllerWithKey = async (req, res, next) => {
    const merchantId = req.params.merchantId;
    if (!merchantId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    try {
        const balance = await getWalletBalanceWithKey(merchantId);
        res.status(200).json(ApiResponse.success({ ...balance }));
    }
    catch (error) {
        next(error); // Pass the error to the error handling middleware
    }
};
const getDisbursementBalanceControllerWithKey = async (req, res, next) => {
    const merchantId = req.params.merchantId;
    if (!merchantId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    try {
        const balance = await getDisbursementBalanceWithKey(merchantId);
        res.status(200).json(ApiResponse.success({ ...balance }));
    }
    catch (error) {
        next(error); // Pass the error to the error handling middleware
    }
};
const disburseTransactions = async (req, res, next) => {
    // Validate request data
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Return validation errors
        res
            .status(400)
            .json(ApiResponse.error(errors.array()[0]));
        return;
    }
    const merchantId = req.user?.id;
    let { amount } = req.body;
    let rate = await getMerchantRate(prisma, merchantId);
    amount *= (1 - +rate);
    if (!merchantId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    try {
        // Get eligible transactions
        const transactions = await getEligibleTransactions(merchantId, prisma);
        if (transactions.length === 0) {
            throw new CustomError('No eligible transactions to disburse', 400);
        }
        let updates = [];
        let totalDisbursed = new Decimal(0);
        if (amount) {
            const amountDecimal = new Decimal(amount);
            const result = calculateDisbursement(transactions, amountDecimal);
            updates = result.updates;
            totalDisbursed = result.totalDisbursed;
        }
        else {
            // Disburse all eligible transactions
            updates = transactions.map((t) => ({
                transaction_id: t.transaction_id,
                disbursed: true,
                balance: new Decimal(0),
                settled_amount: t.settled_amount,
                original_amount: t.original_amount
            }));
            totalDisbursed = transactions.reduce((sum, t) => sum.plus(t.balance), new Decimal(0));
        }
        // Update transactions to set disbursed: true or adjust balances
        await updateTransactions(updates, prisma);
        res.status(200).json(ApiResponse.success({
            message: "Transactions disbursed successfully",
            totalDisbursed: totalDisbursed.toString(),
            transactionsUpdated: updates,
        }));
    }
    catch (error) {
        if (error instanceof CustomError) {
            res.status(error.statusCode).json(ApiResponse.error(error.message));
            return;
        }
        else {
            console.error("Error disbursing transactions:", error);
            res.status(500).json(ApiResponse.error("Internal Server Error"));
            return;
        }
    }
};
export { getWalletBalanceController, getAllMerchantsWalletBalancesController, disburseTransactions, getWalletBalanceControllerWithKey, getDisbursementBalanceControllerWithKey };
