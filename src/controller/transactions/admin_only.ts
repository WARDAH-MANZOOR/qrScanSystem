import { getAllProfitsBalancesByMerchant, getAllTransactionsOfMerchant, getProfitAndBalance } from "@prisma/client/sql";
import { Request, Response } from "express";
import { JwtPayload } from "jsonwebtoken";
import prisma from "prisma/client.js";
import CustomError from "utils/custom_error.js";
import { getDateRange } from "utils/date_method.js";

// const getTransactionOfMerchant = async (req: Request, res: Response) => {
//     try {
//         let { merchantId } = req.params;
//         if (!merchantId || isNaN(parseInt(merchantId))) {
//             let error = new CustomError("Merchant Not Found", 404);
//             res.status(404).send(error);
//         }
//         let transactions = await prisma.$queryRawTyped(getAllTransactionsOfMerchant(parseInt(merchantId)));
//         res.status(200).json(transactions);
//     }
//     catch (err) {
//         let error = new CustomError("Internal Server Error", 500);
//         res.status(500).send(error);
//     }
// }

// const searchTransactions = async (req: Request, res: Response) => {
//     const { transaction_id, merchant_name } = req.query;
//     try {
//         const transactions = await prisma.transaction.findMany({
//             where: {
//                 transaction_id: transaction_id ? transaction_id as string : undefined,
//                 merchant: {
//                     username: merchant_name ? merchant_name as string : undefined,
//                 },
//             },
//         });
//         res.status(200).json(transactions);
//     } catch (error) {
//         error = new CustomError("Internal Server Error", 500)
//         res.status(500).json(error);
//     }
// }

// const getAllProfitAndBalance = async (req: Request, res: Response) => {
//     try {
//         const { range, startDate, endDate } = req.query;

//         if (!range) {
//             throw new CustomError('Range is required', 400);
//         }

//         // Get date range based on the query parameters
//         const { fromDate, toDate } = getDateRange(range as string, startDate as string, endDate as string);

//         // Raw SQL query to calculate total balance and profit for each merchant
//         const merchantsBalanceProfit = await prisma.$queryRawTyped(getProfitAndBalance(fromDate,toDate));

//         res.status(200).json(merchantsBalanceProfit);
//     } catch (error) {
//         error = new CustomError("Internal Server Error",500);
//         res.status(500).json(error);
//     }

// }

// const getProfitAndBalanceByMerchant = async (req: Request, res: Response) => {
//     try {
//         const { range, startDate, endDate } = req.query;
//         const { merchantId } = req.params;
//         if (!range && !merchantId && !isNaN(parseInt(merchantId as string))) {
//             throw new CustomError('Range or merchant id is required', 400);
//         }

//         // Get date range based on the query parameters
//         const { fromDate, toDate } = getDateRange(range as string, startDate as string, endDate as string);

//         // Raw SQL query to calculate total balance and profit for each merchant
//         const merchantsBalanceProfit = await prisma.$queryRawTyped(getAllProfitsBalancesByMerchant(fromDate,toDate,parseInt(merchantId as string)));

//         res.status(200).json(merchantsBalanceProfit);
//     } catch (error) {
//         error = new CustomError("Internal Server Error",500);
//         res.status(500).json(error);
//     }
// }

const getTransactions = async (req: Request, res: Response) => {
    try {
        const { merchantId, transactionId, merchantName } = req.query;

        // Query based on provided parameters
        const transactions = await prisma.transaction.findMany({
            where: {
                ...(transactionId && { transaction_id: transactionId as string }),
                ...(merchantId && { merchant_id: parseInt(merchantId as string) }),
                ...(merchantName && {
                    merchant: {
                        username: merchantName as string,
                    },
                }),
            },
        });

        res.status(200).json(transactions);
    } catch (err) {
        const error = new CustomError("Internal Server Error", 500);
        res.status(500).send(error);
    }
};

const getProAndBal = async (req: Request, res: Response) => {
    try {
        const { merchantId, startDate, endDate, range } = req.query;

        // Get date range based on the query parameters (defaulting to the full range if not provided)
        const { fromDate, toDate } = getDateRange(range as string, startDate as string, endDate as string);

        // Raw SQL query based on whether `merchantId` is provided or not
        const profitAndBalanceQuery = merchantId
            ? getAllProfitsBalancesByMerchant(fromDate, toDate, parseInt(merchantId as string))
            : getProfitAndBalance(fromDate, toDate);

        const merchantsBalanceProfit = await prisma.$queryRawTyped(profitAndBalanceQuery);

        res.status(200).json(merchantsBalanceProfit);
    } catch (err) {
        console.log(err);
        const error = new CustomError("Internal Server Error", 500);
        res.status(500).send(error);
    }
};



export { getTransactions, getProAndBal };