import { parse, parseISO } from "date-fns";
import { Parser } from "json2csv";
import path from "path";
import prisma from "prisma/client.js";
import CustomError from "utils/custom_error.js";
import fs from "fs"
import * as csv from "fast-csv"
import { fileURLToPath } from "url";

const createDisbursementDispute = async (body: any, merchant_id: number) => {
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
        },
            {
                timeout: 10000,
                maxWait: 10000
            });
    } catch (err: any) {
        throw new CustomError(err.message, 500);
    }
};

const updateDisbursementDispute = async (requestId: number, body: any) => {
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
    } catch (err: any) {
        throw new CustomError(err.message, 500);
    }
};

const getDisbursementDisputes = async (params: any, merchantId: any) => {
    try {
        let startDate = params.start as string;
        let endDate = params.end as string;
        const status = params.status as string;
        const merchantOrderId = params.merchantOrderId as string; // NEW: Extract merchantOrderId from params

        const customWhere = {} as any;

        if (startDate && endDate) {
            startDate = startDate.replace(" ", "+");
            endDate = endDate.replace(" ", "+");

            const todayStart = parse(
                startDate,
                "yyyy-MM-dd'T'HH:mm:ssXXX",
                new Date()
            );
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
            skip = (+page > 0 ? parseInt(page as string) - 1 : parseInt(page as string)) * parseInt(limit as string);
            take = parseInt(limit as string);
        }

        const disputes = await prisma.disbursementDispute.findMany({
            ...(skip && { skip: +skip }),
            ...(take && { take: +take + 1 }),
            where: {
                ...(merchantId && { merchant_id: parseInt(merchantId as string) }),
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
            page: page ? parseInt(page as string) : 1,
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
    } catch (err) {
        console.log(err);
        throw new CustomError("Internal Server Error", 500);
    }
};
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXPORT_DIR = path.join(__dirname, "../../../files");
if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });

export const exportDisbursementDispute = async (merchantId: number, params: any) => {
  try {
    const startDate = params?.start?.replace(" ", "+");
    const endDate = params?.end?.replace(" ", "+");
    const status = params?.status as string;
    const merchantOrderId = params?.merchantOrderId as string;

    const filters: any = {};
    if (merchantId) filters["merchant_id"] = +merchantId;
    if (startDate && endDate) {
      filters["disbursementDate"] = {
        gte: parseISO(startDate),
        lt: parseISO(endDate),
      };
    }
    if (status) filters["status"] = status;
    if (merchantOrderId) filters["orderId"] = merchantOrderId;

    const totalRecords = await prisma.disbursementDispute.count({ where: filters });
    let remainingRecords = totalRecords;
    console.log(`📊 Total disbursement disputes: ${totalRecords}`);

    const pageSize = 10000;
    let lastCursor: number | undefined = undefined;
    let hasMore = true;
    let processedCount = 0;

    const fileName = `disbursement_disputes_${Date.now()}.csv`;
    const filePath = path.join(EXPORT_DIR, fileName);
    const fileStream = fs.createWriteStream(filePath);
    const csvStream = csv.format({ headers: true });
    csvStream.pipe(fileStream);

    while (hasMore) {
      const batch: Array<any> = await prisma.disbursementDispute.findMany({
        where: filters,
        orderBy: { id: "asc" },
        cursor: lastCursor ? { id: lastCursor } : undefined,
        skip: lastCursor ? 1 : 0,
        take: pageSize,
        include: {
          merchant: { select: { full_name: true } }
        }
      });

      console.log(`🔄 Fetched batch: ${batch.length}`);
      remainingRecords -= batch.length;

      for (const record of batch) {
        csvStream.write({
          merchant: record.merchant?.full_name || "",
          status: record.status,
          order_id: record.orderId,
          transaction_id: record.transactionId,
          message: record.message,
        });

        lastCursor = record.id;
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

  } catch (error: any) {
    console.error("❌ Export failed:", error);
    throw new CustomError(
      error?.error || "Unable to get disbursement dispute data",
      error?.statusCode || 500
    );
  }
};

export default {
    createDisbursementDispute,
    updateDisbursementDispute,
    getDisbursementDisputes,
    exportDisbursementDispute
};