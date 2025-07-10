import { parse } from "date-fns";
import { JwtPayload } from "jsonwebtoken";
import prisma from "../../prisma/client.js";
import CustomError from "../../utils/custom_error.js";
import { Parser } from "json2csv";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import * as csv from "fast-csv"

const getSettlement = async (params: any, user: JwtPayload) => {
  const merchantId = user?.merchant_id || params.merchant_id;

  if (!merchantId && user?.role !== "Admin") {
    throw new CustomError("Merchant ID is required", 400);
  }

  let filters: { merchant_id?: number } = {};

  if (merchantId) {
    filters["merchant_id"] = +merchantId;
  }

  try {
    const startDate = params?.start?.replace(" ", "+");
    const endDate = params?.end?.replace(" ", "+");

    const customWhere = {} as any;

    if (startDate && endDate) {
      const todayStart = parse(
        startDate,
        "yyyy-MM-dd'T'HH:mm:ssXXX",
        new Date()
      );
      const todayEnd = parse(endDate, "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());

      customWhere["settlementDate"] = {
        gte: todayStart,
        lt: todayEnd,
      };
    }

    let { page, limit } = params;
    // Query based on provided parameters
    let skip, take = 0;
    if (page && limit) {
      skip = (+page > 0 ? parseInt(page as string) - 1 : parseInt(page as string)) * parseInt(limit as string);
      take = parseInt(limit as string);
    }
    const reports = await prisma.settlementReport.findMany({
      ...(skip && { skip: +skip }),
      ...(take && { take: +take + 1 }),
      where: {
        ...filters,
        ...customWhere,
      },
      include: {
        merchant: {
          select: {
            uid: true,
            full_name: true,
          },
        },
      },
      orderBy: {
        settlementDate: "desc"
      }
    });
    const hasMore = reports.length > take;
    if (hasMore) {
      reports.pop(); // Remove the extra record
    }

    // Build meta with hasMore flag
    const meta = {
      page: page ? parseInt(page as string) : 1,
      limit: take,
      hasMore,
    };

    const response = {
      transactions: reports.map((transaction) => ({
        ...transaction,
        jazzCashMerchant: transaction.merchant,
      })),
      meta,
    };

    return response;
  } catch (error: any) {
    return error;
  }
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXPORT_DIR = path.join(__dirname, "../../../files");
if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });

const exportSettlement = async (params: any, user: JwtPayload) => {
  const merchantId = user?.merchant_id || params.merchant_id;

  if (!merchantId && user?.role !== "Admin") {
    throw new CustomError("Merchant ID is required", 400);
  }

  const filters: any = {};
  if (merchantId) filters["merchant_id"] = +merchantId;

  try {
    const startDate = params?.start?.replace(" ", "+");
    const endDate = params?.end?.replace(" ", "+");

    if (startDate && endDate) {
      const start = parse(startDate, "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
      const end = parse(endDate, "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
      filters["settlementDate"] = {
        gte: start,
        lt: end,
      };
    }

    const totalRecords = await prisma.settlementReport.count({ where: filters });
    let remainingRecords = totalRecords;
    let processedCount = 0;
    let totalAmount = 0;

    console.log(`📊 Total settlement reports: ${totalRecords}`);

    const fileName = `settlement_report_${Date.now()}.csv`;
    const filePath = path.join(EXPORT_DIR, fileName);
    const fileStream = fs.createWriteStream(filePath);
    const csvStream = csv.format({ headers: true });
    csvStream.pipe(fileStream);

    const timeZone = "Asia/Karachi";
    const pageSize = 1000;
    let lastCursor: number | undefined = undefined;
    let hasMore = true;

    while (hasMore) {
      const batch: Array<any> = await prisma.settlementReport.findMany({
        where: filters,
        orderBy: { id: "asc" },
        cursor: lastCursor ? { id: lastCursor } : undefined,
        skip: lastCursor ? 1 : 0,
        take: pageSize,
        include: {
          merchant: {
            select: {
              uid: true,
              full_name: true,
            },
          },
        },
      });

      console.log(`🔄 Fetched batch: ${batch.length}`);
      remainingRecords -= batch.length;

      for (const txn of batch) {
        totalAmount += Number(txn.merchantAmount || 0);
        csvStream.write({
          merchant: txn.merchant?.full_name || "",
          merchant_id: txn.merchant?.uid || "",
          settlement_date: txn.settlementDate,
          transaction_count: txn.transactionCount,
          transaction_amount: txn.transactionAmount,
          commission: txn.commission,
          gst: txn.gst,
          withholding_tax: txn.withholdingTax,
          merchant_amount: txn.merchantAmount,
        });

        lastCursor = txn.id;
        processedCount++;
      }

      console.log(`📦 Processed: ${processedCount} | Remaining: ${remainingRecords} | Settled: ${totalAmount.toFixed(2)}`);
      hasMore = batch.length === pageSize;
    }

    await new Promise(resolve => csvStream.end(resolve));
    fs.appendFileSync(filePath, `\nTotal Settled Amount,,${totalAmount.toFixed(2)}`);

    console.log(`✅ Settlement CSV saved: ${filePath}`);

    return {
      filePath,
      downloadUrl: `https://server2.sahulatpay.com/files/${fileName}`,
      totalRecords: processedCount,
      totalAmount: totalAmount.toFixed(2),
    };

  } catch (error: any) {
    console.error("❌ Settlement export failed:", error);
    throw new CustomError("Unable to export settlement report", 500);
  }
};

export { getSettlement, exportSettlement };

