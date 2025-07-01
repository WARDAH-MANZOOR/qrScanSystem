import { parse, parseISO } from "date-fns";
import { Parser } from "json2csv";
import prisma from "prisma/client.js";
import CustomError from "utils/custom_error.js";
const createDisbursementDispute = async (body, merchant_id) => {
    try {
        return await prisma.$transaction(async (tx) => {
            const disbursementDispute = await tx.disbursementDispute.create({
                data: {
                    account: body.account,
                    disbursementDate: new Date(body.disbursementDate),
                    amount: Number(body.amount),
                    merchant_id,
                    sender: body.sender,
                    transactionId: body.transactionId,
                    message: body?.message,
                    status: body?.status,
                    orderId: body?.orderId
                }
            });
            return disbursementDispute;
        }, {
            timeout: 10000,
            maxWait: 10000
        });
    }
    catch (err) {
        throw new CustomError(err.message, 500);
    }
};
const updateDisbursementDispute = async (requestId, body) => {
    try {
        const disbursementDispute = await prisma.disbursementDispute.update({
            where: { id: requestId },
            data: { status: body?.status, message: body?.message }
        });
        return {
            id: disbursementDispute.id,
            status: disbursementDispute.status,
            message: disbursementDispute.message
        };
    }
    catch (err) {
        throw new CustomError(err.message, 500);
    }
};
const getDisbursementDisputes = async (params, merchantId) => {
    try {
        let startDate = params.start;
        let endDate = params.end;
        const status = params.status;
        const merchantOrderId = params.merchantOrderId; // NEW: Extract merchantOrderId from params
        const customWhere = {};
        if (startDate && endDate) {
            startDate = startDate.replace(" ", "+");
            endDate = endDate.replace(" ", "+");
            const todayStart = parse(startDate, "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
            const todayEnd = parse(endDate, "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
            customWhere["disbursementDate"] = {
                gte: todayStart,
                lt: todayEnd,
            };
        }
        if (status) {
            customWhere["status"] = status;
        }
        if (merchantOrderId) { // NEW: Add merchantOrderId filter if provided
            customWhere["orderId"] = merchantOrderId;
        }
        let { page, limit } = params;
        let skip, take = 0;
        if (page && limit) {
            skip = (+page > 0 ? parseInt(page) - 1 : parseInt(page)) * parseInt(limit);
            take = parseInt(limit);
        }
        const disputes = await prisma.disbursementDispute.findMany({
            ...(skip && { skip: +skip }),
            ...(take && { take: +take + 1 }),
            where: {
                ...(merchantId && { merchant_id: parseInt(merchantId) }),
                ...customWhere,
            },
            orderBy: {
                disbursementDate: "desc",
            },
            include: {
                merchant: true
            }
        });
        const hasMore = disputes.length > take;
        if (hasMore) {
            disputes.pop(); // Remove the extra record
        }
        // Build meta with hasMore flag
        const meta = {
            page: page ? parseInt(page) : 1,
            limit: take,
            hasMore,
        };
        const response = {
            disputes: disputes.map((dispute) => ({
                ...dispute,
                merchant: null,
                merchant_name: dispute.merchant.full_name
            })),
            meta,
        };
        return response;
    }
    catch (err) {
        console.log(err);
        throw new CustomError("Internal Server Error", 500);
    }
};
const exportDisbursementDispute = async (merchantId, params) => {
    try {
        const startDate = params?.start?.replace(" ", "+");
        const endDate = params?.end?.replace(" ", "+");
        const status = params?.status; // NEW: Explicitly type status
        const merchantOrderId = params?.merchantOrderId; // NEW: Extract merchantOrderId from params
        const customWhere = {};
        if (merchantId) {
            customWhere["merchantId"] = +merchantId;
        }
        if (startDate && endDate) {
            const todayStart = parseISO(startDate);
            const todayEnd = parseISO(endDate);
            customWhere["disbursementDate"] = {
                gte: todayStart,
                lt: todayEnd,
            };
        }
        if (status) {
            customWhere["status"] = status;
        }
        if (merchantOrderId) { // NEW: Add merchantOrderId filter if provided
            customWhere["orderId"] = merchantOrderId;
        }
        const disputes = await prisma.disbursementDispute
            .findMany({
            where: {
                ...customWhere,
            },
            orderBy: {
                disbursementDate: "desc",
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
            'order_id',
            'transaction_id',
            'message'
        ];
        const data = disputes.map(dispute => ({
            merchant: dispute.merchant.full_name,
            status: dispute.status,
            order_id: dispute.orderId,
            transaction_id: dispute.transactionId,
            message: dispute.message
        }));
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(data);
        const csvNoQuotes = csv.replace(/"/g, '');
        return `${csvNoQuotes}`;
    }
    catch (error) {
        throw new CustomError(error?.error || "Unable to get disbursement", error?.statusCode || 500);
    }
};
export default {
    createDisbursementDispute,
    updateDisbursementDispute,
    getDisbursementDisputes,
    exportDisbursementDispute
};
