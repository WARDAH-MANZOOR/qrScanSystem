import { parse, parseISO } from "date-fns";
import prisma from "../../prisma/client.js";
import { backofficeService } from "../../services/index.js";
import { getWalletBalance } from "../../services/paymentGateway/disbursement.js";
import CustomError from "../../utils/custom_error.js";
import path from "path";
import fs from "fs";
import * as csv from "fast-csv";
import { fileURLToPath } from "url";
const createDisbursementRequest = async (requested_amount, merchant_id) => {
    try {
        await prisma.$transaction(async (tx) => {
            await tx.disbursementRequest.create({
                data: {
                    requestedAmount: requested_amount,
                    merchantId: Number(merchant_id),
                    status: "approved"
                }
            });
            const { walletBalance } = await getWalletBalance(Number(merchant_id));
            const updatedAvailableBalance = walletBalance - Number(requested_amount);
            await backofficeService.adjustMerchantWalletBalanceithTx(Number(merchant_id), updatedAvailableBalance, false, tx);
            await tx.merchant.update({
                where: { merchant_id: Number(merchant_id) },
                data: { balanceToDisburse: { increment: Number(requested_amount) } }
            });
        }, {
            timeout: 300000,
            maxWait: 300000
        });
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
        let skip, take = 0;
        if (page && limit) {
            skip = (+page > 0 ? parseInt(page) - 1 : parseInt(page)) * parseInt(limit);
            take = parseInt(limit);
        }
        const transactions = await prisma.disbursementRequest.findMany({
            ...(skip && { skip: +skip }),
            ...(take && { take: +take + 1 }),
            where: {
                ...(merchantId && { merchantId: parseInt(merchantId) }),
                ...(typeof merchantId !== 'undefined' && merchantId !== null
                    ? { merchantId: Number(merchantId) }
                    : {}),
                ...customWhere,
            },
            orderBy: {
                createdAt: "desc",
            },
            include: {
                merchant: true
            }
        });
        const hasMore = transactions.length > take;
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
                merchant_name: transaction.merchant.full_name
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
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXPORT_DIR = path.join(__dirname, "../../../files");
if (!fs.existsSync(EXPORT_DIR))
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
export const exportDisbursementRequest = async (merchantId, params) => {
    try {
        const startDate = params?.start?.replace(" ", "+");
        const endDate = params?.end?.replace(" ", "+");
        const filters = {};
        if (merchantId)
            filters["merchantId"] = +merchantId;
        if (startDate && endDate) {
            filters["createdAt"] = {
                gte: parseISO(startDate),
                lt: parseISO(endDate),
            };
        }
        if (params.status) {
            filters["status"] = params.status;
        }
        const totalRecords = await prisma.disbursementRequest.count({ where: filters });
        let remainingRecords = totalRecords;
        let processedCount = 0;
        console.log(`📊 Total disbursement requests: ${totalRecords}`);
        const fileName = `disbursement_requests_${Date.now()}.csv`;
        const filePath = path.join(EXPORT_DIR, fileName);
        const fileStream = fs.createWriteStream(filePath);
        const csvStream = csv.format({ headers: true });
        csvStream.pipe(fileStream);
        const pageSize = 10000;
        let lastCursor = undefined;
        let hasMore = true;
        const timeZone = "Asia/Karachi";
        while (hasMore) {
            const batch = await prisma.disbursementRequest.findMany({
                where: filters,
                orderBy: { id: "asc" },
                cursor: lastCursor ? { id: lastCursor } : undefined,
                skip: lastCursor ? 1 : 0,
                take: pageSize,
                include: {
                    merchant: { select: { full_name: true } }
                },
            });
            console.log(`🔄 Fetched batch: ${batch.length}`);
            remainingRecords -= batch.length;
            for (const txn of batch) {
                csvStream.write({
                    merchant: txn.merchant?.full_name || "",
                    status: txn.status,
                    requested_amount: txn.requestedAmount,
                    date_time: txn.createdAt,
                });
                lastCursor = txn.id;
                processedCount++;
            }
            console.log(`📦 Processed: ${processedCount} | Remaining: ${remainingRecords}`);
            hasMore = batch.length === pageSize;
        }
        await new Promise(resolve => csvStream.end(resolve));
        console.log(`✅ CSV saved at: ${filePath}`);
        return {
            filePath,
            downloadUrl: `https://server2.sahulatpay.com/files/${fileName}`,
            totalRecords: processedCount
        };
    }
    catch (error) {
        console.error("❌ Export failed:", error);
        throw new CustomError(error?.error || "Unable to export disbursement requests", error?.statusCode || 500);
    }
};
export default {
    createDisbursementRequest,
    updateDisbursementRequestStatus,
    getDisbursementRequests,
    exportDisbursementRequest
};
