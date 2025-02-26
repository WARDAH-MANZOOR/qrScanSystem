import { jazzCashService } from "../../services/index.js";
import ApiResponse from "../../utils/ApiResponse.js";
import { getAllProfitsBalancesByMerchant, getProfitAndBalance, } from "@prisma/client/sql";
import prisma from "../../prisma/client.js";
import CustomError from "../../utils/custom_error.js";
import { getDateRange } from "../../utils/date_method.js";
import { parse } from "date-fns";
import analytics from "./analytics.js";
import { Parser } from "json2csv";
import { format, toZonedTime } from "date-fns-tz";
const createTransaction = async (req, res, next) => {
    try {
        const paymentData = req.body;
        let merchantId = req.user?.id;
        const result = await jazzCashService.initiateJazzCashPayment(paymentData);
        return res.status(200).json(ApiResponse.success(result));
    }
    catch (error) {
        next(error);
    }
};
const getTransactions = async (req, res) => {
    try {
        console.log(req.user);
        const merchantId = req.user?.merchant_id || req.query?.merchantId;
        const { transactionId, merchantName, merchantTransactionId } = req.query;
        let startDate = req.query?.start;
        let endDate = req.query?.end;
        const status = req.query?.status;
        const search = req.query?.search || "";
        const msisdn = req.query?.msisdn || "";
        const customWhere = {};
        if (startDate && endDate) {
            startDate = startDate.replace(" ", "+");
            endDate = endDate.replace(" ", "+");
            const todayStart = parse(startDate, "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
            const todayEnd = parse(endDate, "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
            customWhere["date_time"] = {
                gte: todayStart,
                lt: todayEnd,
            };
        }
        if (status) {
            customWhere["status"] = status;
        }
        if (search) {
            customWhere["transaction_id"] = {
                contains: search,
            };
        }
        if (msisdn) {
            customWhere["providerDetails"] = {
                path: ['msisdn'],
                equals: msisdn
            };
        }
        if (merchantTransactionId) {
            customWhere["merchant_transaction_id"] = { contains: merchantTransactionId };
        }
        let { page, limit } = req.query;
        // Query based on provided parameters
        let skip, take;
        if (page && limit) {
            skip = (+page > 0 ? parseInt(page) - 1 : parseInt(page)) * parseInt(limit);
            take = parseInt(limit);
        }
        const transactions = await prisma.transaction.findMany({
            ...(skip && { skip: +skip }),
            ...(take && { take: +take }),
            where: {
                ...(transactionId && { transaction_id: transactionId }),
                ...(merchantId && { merchant_id: parseInt(merchantId) }),
                ...(merchantName && {
                    merchant: {
                        username: merchantName,
                    },
                }),
                ...customWhere,
            },
            orderBy: {
                date_time: "desc",
            },
            include: {
                merchant: {
                    include: {
                        groups: {
                            include: {
                                merchant: {
                                    include: {
                                        jazzCashMerchant: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        let meta = {};
        if (page && take) {
            // Get the total count of transactions
            const total = await prisma.transaction.count({
                where: {
                    ...(transactionId && { transaction_id: transactionId }),
                    ...(merchantId && { merchant_id: parseInt(merchantId) }),
                    ...(merchantName && {
                        merchant: {
                            username: merchantName,
                        },
                    }),
                    ...customWhere,
                }
            });
            // Calculate the total number of pages
            const pages = Math.ceil(total / +take);
            meta = {
                total,
                pages,
                page: parseInt(page),
                limit: take
            };
        }
        const response = {
            transactions: transactions.map((transaction) => ({
                ...transaction,
                jazzCashMerchant: transaction.merchant.groups[0]?.merchant?.jazzCashMerchant,
            })),
            meta,
        };
        res.status(200).json(response);
    }
    catch (err) {
        console.log(err);
        const error = new CustomError("Internal Server Error", 500);
        res.status(500).send(error);
    }
};
const getTeleTransactions = async (req, res) => {
    try {
        console.log(req.user);
        const { merchantId, transactionId, merchantName, merchantTransactionId } = req.query;
        let startDate = req.query?.start;
        let endDate = req.query?.end;
        const status = req.query?.status;
        const search = req.query?.search || "";
        const msisdn = req.query?.msisdn || "";
        const customWhere = {};
        if (startDate && endDate) {
            startDate = startDate.replace(" ", "+");
            endDate = endDate.replace(" ", "+");
            const todayStart = parse(startDate, "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
            const todayEnd = parse(endDate, "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
            customWhere["date_time"] = {
                gte: todayStart,
                lt: todayEnd,
            };
        }
        if (status) {
            customWhere["status"] = status;
        }
        if (search) {
            customWhere["transaction_id"] = {
                contains: search,
            };
        }
        if (msisdn) {
            customWhere["providerDetails"] = {
                path: ['msisdn'],
                equals: msisdn
            };
        }
        if (merchantTransactionId) {
            customWhere["merchant_transaction_id"] = { contains: merchantTransactionId };
        }
        let { page, limit } = req.query;
        // Query based on provided parameters
        let skip, take;
        if (page && limit) {
            skip = (+page > 0 ? parseInt(page) - 1 : parseInt(page)) * parseInt(limit);
            take = parseInt(limit);
        }
        const transactions = await prisma.transaction.findMany({
            ...(skip && { skip: +skip }),
            ...(take && { take: +take }),
            where: {
                ...(transactionId && { transaction_id: transactionId }),
                ...(merchantId && { merchant_id: parseInt(merchantId) }),
                ...(merchantName && {
                    merchant: {
                        username: merchantName,
                    },
                }),
                ...customWhere,
            },
            orderBy: {
                date_time: "desc",
            },
            include: {
                merchant: {
                    include: {
                        groups: {
                            include: {
                                merchant: {
                                    include: {
                                        jazzCashMerchant: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        let meta = {};
        if (page && take) {
            // Get the total count of transactions
            const total = await prisma.transaction.count({
                where: {
                    ...(transactionId && { transaction_id: transactionId }),
                    ...(merchantId && { merchant_id: parseInt(merchantId) }),
                    ...(merchantName && {
                        merchant: {
                            username: merchantName,
                        },
                    }),
                    ...customWhere,
                }
            });
            // Calculate the total number of pages
            const pages = Math.ceil(total / +take);
            meta = {
                total,
                pages,
                page: parseInt(page),
                limit: take
            };
        }
        const response = {
            transactions: transactions.map((transaction) => ({
                ...transaction,
                jazzCashMerchant: transaction.merchant.groups[0]?.merchant?.jazzCashMerchant,
            })),
            meta,
        };
        res.status(200).json(response);
    }
    catch (err) {
        console.log(err);
        const error = new CustomError("Internal Server Error", 500);
        res.status(500).send(error);
    }
};
const exportTransactions = async (req, res) => {
    try {
        const merchantId = req.user?.merchant_id || req.query?.merchantId;
        const { transactionId, merchantName, merchantTransactionId } = req.query;
        let startDate = req.query?.start;
        let endDate = req.query?.end;
        const status = req.query?.status;
        const search = req.query?.search || "";
        const msisdn = req.query?.msisdn || "";
        const customWhere = {};
        if (startDate && endDate) {
            startDate = startDate.replace(" ", "+");
            endDate = endDate.replace(" ", "+");
            const todayStart = parse(startDate, "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
            const todayEnd = parse(endDate, "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
            customWhere["date_time"] = {
                gte: todayStart,
                lt: todayEnd,
            };
        }
        if (status) {
            customWhere["status"] = status;
        }
        if (search) {
            customWhere["transaction_id"] = {
                contains: search,
            };
        }
        if (msisdn) {
            customWhere["providerDetails"] = {
                path: ['msisdn'],
                equals: msisdn
            };
        }
        if (merchantTransactionId) {
            customWhere["merchant_transaction_id"] = { contains: merchantTransactionId };
        }
        const transactions = await prisma.transaction.findMany({
            where: {
                ...(transactionId && { transaction_id: transactionId }),
                ...(merchantId && { merchant_id: parseInt(merchantId) }),
                ...(merchantName && {
                    merchant: {
                        username: merchantName,
                    },
                }),
                ...customWhere,
            },
            orderBy: {
                date_time: "desc",
            },
        });
        const totalAmount = transactions.reduce((sum, transaction) => sum + Number(transaction.settled_amount), 0);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
        const fields = [
            'transaction_id',
            'account',
            'merchant_transaction_id',
            'date_time',
            'original_amount',
            'commission',
            'settled_amount',
            'response_message',
            'status',
            'type',
            'provider',
            'callback_sent'
        ];
        const timeZone = "Asia/Karachi";
        const data = transactions.map(transaction => ({
            transaction_id: transaction.transaction_id,
            account: transaction.providerDetails?.msisdn,
            merchant_transaction_id: transaction.merchant_transaction_id,
            date_time: format(toZonedTime(transaction.date_time, timeZone), 'yyyy-MM-dd HH:mm:ss', { timeZone }),
            original_amount: transaction.original_amount,
            commission: Number(transaction.original_amount) - Number(transaction.settled_amount),
            settled_amount: transaction.settled_amount,
            response_message: transaction.response_message,
            status: transaction.status,
            type: transaction.type,
            provider: transaction.providerDetails?.name,
            callback_sent: transaction.callback_sent
        }));
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(data);
        res.header('Content-Type', 'text/csv');
        res.attachment('transaction_report.csv');
        res.send(`${csv}\nTotal Settled Amount,,${totalAmount}`);
    }
    catch (err) {
        console.error(err);
        const error = new CustomError("Internal Server Error", 500);
        res.status(500).send(error);
    }
};
const getProAndBal = async (req, res) => {
    try {
        const { merchantId, startDate, endDate, range } = req.query;
        // Get date range based on the query parameters (defaulting to the full range if not provided)
        const { fromDate, toDate } = getDateRange(range, startDate, endDate);
        // Raw SQL query based on whether `merchantId` is provided or not
        const profitAndBalanceQuery = merchantId
            ? getAllProfitsBalancesByMerchant(fromDate, toDate, parseInt(merchantId))
            : getProfitAndBalance(fromDate, toDate);
        const merchantsBalanceProfit = await prisma.$queryRawTyped(profitAndBalanceQuery);
        res.status(200).json(merchantsBalanceProfit);
    }
    catch (err) {
        console.log(err);
        const error = new CustomError("Internal Server Error", 500);
        res.status(500).send(error);
    }
};
export default {
    createTransaction,
    getTransactions,
    getProAndBal,
    exportTransactions,
    getTeleTransactions,
    ...analytics,
};
// ...(skip && { skip: +skip }),
//       ...(take && { take: +take }),
