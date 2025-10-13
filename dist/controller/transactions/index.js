import { jazzCashService } from "../../services/index.js";
import ApiResponse from "../../utils/ApiResponse.js";
import { getAllProfitsBalancesByMerchant, getProfitAndBalance, } from "@prisma/client/sql";
import prisma from "../../prisma/client.js";
import CustomError from "../../utils/custom_error.js";
import { getDateRange } from "../../utils/date_method.js";
import { parse, subMinutes } from "date-fns";
import analytics from "./analytics.js";
import { format, toZonedTime } from "date-fns-tz";
import * as csv from "fast-csv";
import fs from "fs";
import path from "path";
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
        const { transactionId, merchantName, merchantTransactionId, response_message } = req.query;
        let startDate = req.query?.start;
        let endDate = req.query?.end;
        const status = req.query?.status;
        const search = req.query?.search || "";
        const msisdn = req.query?.msisdn || "";
        const provider = req.query?.provider || "";
        const customWhere = { AND: [] };
        if (startDate && endDate) {
            const todayStart = parse(startDate.replace(" ", "+"), "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
            const todayEnd = parse(endDate.replace(" ", "+"), "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
            customWhere.AND.push({
                date_time: {
                    gte: todayStart,
                    lt: todayEnd,
                }
            });
        }
        if (status) {
            customWhere.AND.push({ status });
        }
        if (search) {
            customWhere.AND.push({
                transaction_id: {
                    contains: search
                }
            });
        }
        if (msisdn) {
            customWhere.AND.push({
                providerDetails: {
                    path: ['msisdn'],
                    equals: msisdn
                }
            });
        }
        if (provider) {
            customWhere.AND.push({
                providerDetails: {
                    path: ['name'],
                    equals: provider
                }
            });
        }
        if (merchantTransactionId) {
            customWhere.AND.push({
                merchant_transaction_id: merchantTransactionId
            });
        }
        if (response_message) {
            customWhere.AND.push({
                response_message: {
                    contains: response_message
                }
            });
        }
        let { page, limit } = req.query;
        // Query based on provided parameters
        let skip, take = 0;
        if (page && limit) {
            skip = (+page > 0 ? parseInt(page) - 1 : parseInt(page)) * parseInt(limit);
            take = parseInt(limit);
        }
        const transactions = await prisma.transaction.findMany({
            ...(skip && { skip: +skip }),
            ...(take && { take: +take + 1 }),
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
            select: {
                transaction_id: true,
                merchant_transaction_id: true,
                merchant: true,
                date_time: true,
                providerDetails: true,
                original_amount: true,
                status: true,
                settlement: true,
                type: true,
                callback_sent: true,
                response_message: true
            }
        });
        const hasMore = transactions.length > take;
        console.log(hasMore, take, transactions.length);
        if (hasMore) {
            transactions.pop(); // Remove the extra record
        }
        // Build meta with hasMore flag
        const meta = {
            page: page ? parseInt(page) : 1,
            limit: take,
            hasMore,
        };
        const response = {
            transactions: transactions.map((transaction) => ({
                ...transaction,
                providerDetails: { id: transaction.providerDetails.id, name: transaction.providerDetails.name, msisdn: transaction.providerDetails.msisdn, transactionId: transaction.providerDetails?.transactionId },
                merchant: { username: transaction.merchant.username },
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
        const { merchantId, transactionId, merchantName, merchantTransactionId, response_message, uid } = req.query;
        let startDate = req.query?.start;
        let endDate = req.query?.end;
        const status = req.query?.status;
        const search = req.query?.search || "";
        const msisdn = req.query?.msisdn || "";
        const provider = req.query?.provider || "";
        const customWhere = { AND: [] };
        if (startDate && endDate) {
            const todayStart = parse(startDate.replace(" ", "+"), "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
            const todayEnd = parse(endDate.replace(" ", "+"), "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
            customWhere.AND.push({
                date_time: {
                    gte: todayStart,
                    lt: todayEnd,
                }
            });
        }
        if (status) {
            customWhere.AND.push({ status });
        }
        if (search) {
            customWhere.AND.push({
                transaction_id: {
                    contains: search
                }
            });
        }
        if (msisdn) {
            customWhere.AND.push({
                providerDetails: {
                    path: ['msisdn'],
                    equals: msisdn
                }
            });
        }
        if (provider) {
            customWhere.AND.push({
                providerDetails: {
                    path: ['name'],
                    equals: provider
                }
            });
        }
        if (merchantTransactionId) {
            customWhere.AND.push({
                merchant_transaction_id: merchantTransactionId
            });
        }
        if (response_message) {
            customWhere.AND.push({
                response_message: {
                    contains: response_message
                }
            });
        }
        if (uid) {
            customWhere.AND.push({
                merchant: {
                    uid: uid
                }
            });
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
const getTeleTransactionsLast15Mins = async (req, res) => {
    try {
        const { merchantId, transactionId, merchantName, merchantTransactionId, response_message } = req.query;
        let startDate = req.query?.start;
        let endDate = req.query?.end;
        const status = req.query?.status;
        const search = req.query?.search || "";
        const msisdn = req.query?.msisdn || "";
        const provider = req.query?.provider || "";
        const customWhere = { AND: [] };
        if (startDate && endDate) {
            const todayStart = parse(startDate.replace(" ", "+"), "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
            const todayEnd = parse(endDate.replace(" ", "+"), "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
            customWhere.AND.push({
                date_time: {
                    gte: todayStart,
                    lt: todayEnd,
                }
            });
        }
        if (status) {
            customWhere.AND.push({ status });
        }
        if (search) {
            customWhere.AND.push({
                transaction_id: {
                    contains: search
                }
            });
        }
        if (msisdn) {
            customWhere.AND.push({
                providerDetails: {
                    path: ['msisdn'],
                    equals: msisdn
                }
            });
        }
        if (provider) {
            customWhere.AND.push({
                providerDetails: {
                    path: ['name'],
                    equals: provider
                }
            });
        }
        if (merchantTransactionId) {
            customWhere.AND.push({
                merchant_transaction_id: merchantTransactionId
            });
        }
        if (response_message) {
            customWhere.AND.push({
                response_message: {
                    contains: response_message
                }
            });
        }
        if (merchantId) {
            customWhere["merchant_id"] = Number(merchantId);
        }
        const timezone = 'Asia/Karachi';
        const currentTime = toZonedTime(new Date(), timezone);
        const fifteenMinutesAgo = subMinutes(currentTime, 15);
        const transactions = await prisma.transaction.findMany({
            where: {
                ...customWhere,
                date_time: {
                    gte: fifteenMinutesAgo,
                    lte: currentTime,
                },
            },
            orderBy: {
                date_time: 'desc',
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
                }
            }
        });
        res.status(200).json({ transactions });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
const getTeleTransactionsLast4Mins = async (req, res) => {
    try {
        const { merchantId, transactionId, merchantName, merchantTransactionId, response_message } = req.query;
        let startDate = req.query?.start;
        let endDate = req.query?.end;
        const status = req.query?.status;
        const search = req.query?.search || "";
        const msisdn = req.query?.msisdn || "";
        const provider = req.query?.provider || "";
        const customWhere = { AND: [] };
        if (startDate && endDate) {
            const todayStart = parse(startDate.replace(" ", "+"), "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
            const todayEnd = parse(endDate.replace(" ", "+"), "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
            customWhere.AND.push({
                date_time: {
                    gte: todayStart,
                    lt: todayEnd,
                }
            });
        }
        if (status) {
            customWhere.AND.push({ status });
        }
        if (search) {
            customWhere.AND.push({
                transaction_id: {
                    contains: search
                }
            });
        }
        if (msisdn) {
            customWhere.AND.push({
                providerDetails: {
                    path: ['msisdn'],
                    equals: msisdn
                }
            });
        }
        if (provider) {
            customWhere.AND.push({
                providerDetails: {
                    path: ['name'],
                    equals: provider
                }
            });
        }
        if (merchantTransactionId) {
            customWhere.AND.push({
                merchant_transaction_id: merchantTransactionId
            });
        }
        if (response_message) {
            customWhere.AND.push({
                response_message: {
                    contains: response_message
                }
            });
        }
        if (merchantId) {
            customWhere["merchant_id"] = Number(merchantId);
        }
        const timezone = 'Asia/Karachi';
        const currentTime = toZonedTime(new Date(), timezone);
        const twoMinutesAgo = subMinutes(currentTime, 4);
        const transactions = await prisma.transaction.findMany({
            where: {
                ...customWhere,
                date_time: {
                    gte: twoMinutesAgo,
                    lte: currentTime,
                },
            },
            orderBy: {
                date_time: 'desc',
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
                }
            }
        });
        res.status(200).json({ transactions });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
const getTeleTransactionsLast15MinsFromLast3Mins = async (req, res) => {
    try {
        const { merchantId, transactionId, merchantName, merchantTransactionId, response_message } = req.query;
        let startDate = req.query?.start;
        let endDate = req.query?.end;
        const status = req.query?.status;
        const search = req.query?.search || "";
        const msisdn = req.query?.msisdn || "";
        const provider = req.query?.provider || "";
        const customWhere = { AND: [] };
        if (startDate && endDate) {
            const todayStart = parse(startDate.replace(" ", "+"), "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
            const todayEnd = parse(endDate.replace(" ", "+"), "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
            customWhere.AND.push({
                date_time: {
                    gte: todayStart,
                    lt: todayEnd,
                }
            });
        }
        if (status) {
            customWhere.AND.push({ status });
        }
        if (search) {
            customWhere.AND.push({
                transaction_id: {
                    contains: search
                }
            });
        }
        if (msisdn) {
            customWhere.AND.push({
                providerDetails: {
                    path: ['msisdn'],
                    equals: msisdn
                }
            });
        }
        if (provider) {
            customWhere.AND.push({
                providerDetails: {
                    path: ['name'],
                    equals: provider
                }
            });
        }
        if (merchantTransactionId) {
            customWhere.AND.push({
                merchant_transaction_id: merchantTransactionId
            });
        }
        if (response_message) {
            customWhere.AND.push({
                response_message: {
                    contains: response_message
                }
            });
        }
        if (merchantId) {
            customWhere["merchant_id"] = Number(merchantId);
        }
        const timezone = 'Asia/Karachi';
        const currentTime = toZonedTime(new Date(), timezone);
        const fifteenMinutesAgo = subMinutes(currentTime, 15);
        const threeMinutesAgo = subMinutes(currentTime, 3);
        const transactions = await prisma.transaction.findMany({
            where: {
                ...customWhere,
                date_time: {
                    gte: fifteenMinutesAgo,
                    lte: threeMinutesAgo,
                },
            },
            orderBy: {
                date_time: 'desc',
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
                }
            }
        });
        res.status(200).json({ transactions });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
const exportTransactions = async (req, res) => {
    try {
        const merchantId = req.user?.merchant_id || req.query?.merchantId;
        const { transactionId, merchantName, merchantTransactionId } = req.query;
        const startDate = req.query?.start;
        const endDate = req.query?.end;
        const status = req.query?.status;
        const search = req.query?.search || "";
        const msisdn = req.query?.msisdn || "";
        const provider = req.query?.provider || "";
        const andConditions = [];
        if (startDate && endDate) {
            const todayStart = parse(startDate.replace(" ", "+"), "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
            const todayEnd = parse(endDate.replace(" ", "+"), "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
            andConditions.push({
                date_time: {
                    gte: todayStart,
                    lt: todayEnd,
                },
            });
        }
        if (status)
            andConditions.push({ status });
        if (search)
            andConditions.push({ transaction_id: { contains: search } });
        if (msisdn)
            andConditions.push({ providerDetails: { path: ['msisdn'], equals: msisdn } });
        if (provider)
            andConditions.push({ providerDetails: { path: ['name'], equals: provider } });
        if (merchantTransactionId)
            andConditions.push({ merchant_transaction_id: merchantTransactionId });
        const baseWhere = {
            ...(transactionId && { transaction_id: transactionId }),
            ...(merchantId && { merchant_id: parseInt(merchantId) }),
            ...(merchantName && {
                merchant: {
                    username: merchantName,
                },
            }),
            ...(andConditions.length > 0 && { AND: andConditions }),
        };
        const timeZone = "Asia/Karachi";
        const pageSize = 10000;
        let lastCursor = undefined;
        let hasMore = true;
        let totalSettledAmount = 0;
        let processedCount = 0;
        // Get total record count
        const totalRecords = await prisma.transaction.count({ where: baseWhere });
        let remainingRecords = totalRecords;
        console.log(`📊 Total matching records: ${totalRecords}`);
        // Setup CSV stream into memory
        const EXPORT_DIR = "./files/"; // Or some other persistent folder
        if (!fs.existsSync(EXPORT_DIR))
            fs.mkdirSync(EXPORT_DIR, { recursive: true });
        const fileName = `transactions_${Date.now()}.csv`;
        const filePath = path.join(EXPORT_DIR, fileName);
        const fileWriteStream = fs.createWriteStream(filePath);
        const csvStream = csv.format({ headers: true });
        csvStream.pipe(fileWriteStream);
        while (hasMore) {
            const batch = await prisma.transaction.findMany({
                where: baseWhere,
                orderBy: { transaction_id: "asc" }, // ✅ matches cursor
                cursor: lastCursor ? { transaction_id: lastCursor } : undefined,
                skip: lastCursor ? 1 : 0,
                take: pageSize,
                select: {
                    transaction_id: true,
                    merchant_transaction_id: true,
                    original_amount: true,
                    settled_amount: true,
                    response_message: true,
                    status: true,
                    type: true,
                    date_time: true,
                    callback_sent: true,
                    providerDetails: true,
                },
            });
            console.log(`🔄 Fetched batch: ${batch.length} records`);
            remainingRecords -= batch.length;
            for (const txn of batch) {
                const commission = Number(txn.original_amount) - Number(txn.settled_amount);
                totalSettledAmount += Number(txn.settled_amount);
                processedCount++;
                csvStream.write({
                    transaction_id: txn.transaction_id,
                    account: txn.providerDetails?.msisdn || "",
                    merchant_transaction_id: txn.merchant_transaction_id,
                    date_time: format(toZonedTime(txn.date_time, timeZone), "yyyy-MM-dd HH:mm:ss", { timeZone }),
                    original_amount: txn.original_amount,
                    commission: commission,
                    settled_amount: txn.settled_amount,
                    status: txn.status,
                    type: txn.type,
                    provider: txn.providerDetails?.name || "",
                    callback_sent: txn.callback_sent,
                    response_message: txn.response_message,
                });
                lastCursor = txn.transaction_id;
            }
            console.log(`📦 Processed: ${processedCount} | Remaining: ${remainingRecords} | Settled: ${totalSettledAmount.toFixed(2)}`);
            hasMore = batch.length === pageSize;
        }
        console.log(`✅ Export complete: Total Processed = ${processedCount}`);
        console.log(`💰 Final Total Settled Amount = ${totalSettledAmount.toFixed(2)}`);
        await new Promise(resolve => csvStream.end(resolve));
        await fs.promises.appendFile(filePath, `\nTotal Settled Amount,,${totalSettledAmount.toFixed(2)}`);
        const csvData = await fs.promises.readFile(filePath, "utf-8");
        console.log(`📁 File saved permanently at: ${filePath}`);
        res.status(200).json({
            message: "CSV generated successfully",
            fileSize: fs.statSync(filePath).size,
            downloadUrl: `https://server2.sahulatpay.com/files/${fileName}`, // or S3 URL
        });
        // res.json({ message: "Export completed", filePath, downloadUrl: `/exports/${fileName}` });
    }
    catch (err) {
        console.error("❌ CSV Export Error:", err);
        res.status(500).json({ message: "Failed to export transactions" });
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
    getTeleTransactionsLast15Mins,
    getTeleTransactionsLast4Mins,
    getTeleTransactionsLast15MinsFromLast3Mins,
    ...analytics,
};
// ...(skip && { skip: +skip }),
//       ...(take && { take: +take }),
