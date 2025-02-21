import { parse, parseISO } from "date-fns";
import { Parser } from "json2csv";
import prisma from "../../prisma/client.js";
import { backofficeService } from "../../services/index.js";
import { getWalletBalance } from "../../services/paymentGateway/disbursement.js";
import CustomError from "../../utils/custom_error.js";
const createDisbursementRequest = async (requested_amount, merchant_id) => {
    try {
        await prisma.disbursementRequest.create({
            data: {
                requestedAmount: requested_amount,
                merchantId: merchant_id,
                status: "pending"
            }
        });
        const { walletBalance } = await getWalletBalance(merchant_id);
        const updatedAvailableBalance = walletBalance - Number(requested_amount);
        await backofficeService.adjustMerchantWalletBalance(merchant_id, updatedAvailableBalance, false);
    }
    catch (err) {
        throw new CustomError(err.message, 500);
    }
};
const updateDisbursementRequestStatus = async (requestId, status) => {
    try {
        const disbursementRequest = await prisma.disbursementRequest.update({
            where: { id: requestId },
            data: { status: status }
        });
        if (status == "approved") {
            await prisma.merchant.update({
                where: { merchant_id: disbursementRequest.merchantId },
                data: { balanceToDisburse: { increment: Number(disbursementRequest.requestedAmount) } }
            });
        }
        else if (status == "rejected") {
            const { walletBalance } = await getWalletBalance(disbursementRequest.merchantId);
            const updatedAvailableBalance = walletBalance + Number(disbursementRequest.requestedAmount);
            await backofficeService.adjustMerchantWalletBalance(disbursementRequest.merchantId, updatedAvailableBalance, false);
        }
        return {
            id: disbursementRequest.id,
            status: disbursementRequest.status
        };
    }
    catch (err) {
        throw new CustomError(err.message, 500);
    }
};
const getDisbursementRequests = async (params, merchantId) => {
    try {
        let startDate = params.start;
        let endDate = params.end;
        const status = params.status;
        const customWhere = {};
        if (startDate && endDate) {
            startDate = startDate.replace(" ", "+");
            endDate = endDate.replace(" ", "+");
            const todayStart = parse(startDate, "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
            const todayEnd = parse(endDate, "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
            customWhere["createdAt"] = {
                gte: todayStart,
                lt: todayEnd,
            };
        }
        if (status) {
            customWhere["status"] = status;
        }
        let { page, limit } = params;
        // Query based on provided parameters
        let skip, take;
        if (page && limit) {
            skip = (+page > 0 ? parseInt(page) - 1 : parseInt(page)) * parseInt(limit);
            take = parseInt(limit);
        }
        const transactions = await prisma.disbursementRequest.findMany({
            ...(skip && { skip: +skip }),
            ...(take && { take: +take }),
            where: {
                ...(merchantId && { merchantId: parseInt(merchantId) }),
                ...customWhere,
            },
            orderBy: {
                createdAt: "desc",
            }
        });
        let meta = {};
        if (page && take) {
            // Get the total count of transactions
            const total = await prisma.disbursementRequest.count({
                where: {
                    ...(merchantId && { merchantId: parseInt(merchantId) }),
                    ...customWhere,
                },
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
            })),
            meta,
        };
        return response;
    }
    catch (err) {
        console.log(err);
        const error = new CustomError("Internal Server Error", 500);
        return error;
    }
};
const exportDisbursementRequest = async (merchantId, params) => {
    try {
        const startDate = params?.start?.replace(" ", "+");
        const endDate = params?.end?.replace(" ", "+");
        const customWhere = {};
        if (merchantId) {
            customWhere["merchantId"] = +merchantId;
        }
        if (startDate && endDate) {
            const todayStart = parseISO(startDate);
            const todayEnd = parseISO(endDate);
            customWhere["createdAt"] = {
                gte: todayStart,
                lt: todayEnd,
            };
        }
        if (params.status) {
            customWhere["status"] = params.status;
        }
        const disbursements = await prisma.disbursementRequest
            .findMany({
            where: {
                ...customWhere,
            },
            orderBy: {
                createdAt: "desc",
            },
            include: {
                merchant: {
                    select: {
                        uid: true,
                        full_name: true,
                    },
                },
            },
        })
            .catch((err) => {
            console.log(err);
            throw new CustomError("Unable to get disbursement history", 500);
        });
        const fields = [
            'merchant',
            'status',
            'requested_amount',
            'date_time'
        ];
        const data = disbursements.map(transaction => ({
            merchant: transaction.merchant.full_name,
            status: transaction.status,
            requested_amount: transaction.requestedAmount,
            date_time: transaction.createdAt
        }));
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(data);
        return `${csv}`;
    }
    catch (error) {
        throw new CustomError(error?.error || "Unable to get disbursement", error?.statusCode || 500);
    }
};
export default {
    createDisbursementRequest,
    updateDisbursementRequestStatus,
    getDisbursementRequests,
    exportDisbursementRequest
};
