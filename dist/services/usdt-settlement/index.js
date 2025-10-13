import { parseISO } from "date-fns";
import path from "path";
import prisma from "prisma/client.js";
import { fileURLToPath } from "url";
import CustomError from "utils/custom_error.js";
import fs from "fs";
import * as csv from "fast-csv";
const getUsdtSettlements = async (params, merchantId) => {
    try {
        const startDate = params?.start?.replace(" ", "+");
        const endDate = params?.end?.replace(" ", "+");
        const customWhere = {};
        if (merchantId) {
            customWhere["merchant_id"] = +merchantId;
        }
        if (startDate && endDate) {
            const todayStart = parseISO(startDate);
            const todayEnd = parseISO(endDate);
            customWhere["date"] = {
                gte: todayStart,
                lt: todayEnd,
            };
        }
        let { page, limit } = params;
        // Query based on provided parameters
        let skip, take = 0;
        if (page && limit) {
            skip = (+page > 0 ? parseInt(page) - 1 : parseInt(page)) * parseInt(limit);
            take = parseInt(limit);
        }
        let records = await prisma.uSDTSettlement.findMany({
            ...(skip && { skip: +skip }),
            ...(take && { take: +take + 1 }),
            where: {
                ...customWhere,
            },
            include: {
                merchant: true
            },
            orderBy: {
                date: 'desc'
            }
        });
        let records2 = records.map((record) => ({
            ...record,
            merchant_name: record.merchant.username,
        }));
        console.log("Records: ", records2);
        const hasMore = records.length > take;
        if (hasMore) {
            records.pop(); // Remove the extra record
        }
        // Build meta with hasMore flag
        const meta = {
            page: page ? parseInt(page) : 1,
            limit: take,
            hasMore,
        };
        return { records: records2, meta };
    }
    catch (error) {
        console.log(error);
    }
};
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXPORT_DIR = path.join(__dirname, "../../../files");
if (!fs.existsSync(EXPORT_DIR))
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
const exportUsdtSettlements = async (merchantId, params) => {
    try {
        const startDate = params?.start?.replace(" ", "+");
        const endDate = params?.end?.replace(" ", "+");
        const filters = {};
        if (merchantId)
            filters["merchant_id"] = +merchantId;
        if (startDate && endDate) {
            filters["date"] = {
                gte: parseISO(startDate),
                lt: parseISO(endDate),
            };
        }
        const totalRecords = await prisma.uSDTSettlement.count({ where: filters });
        let remainingRecords = totalRecords;
        let processedCount = 0;
        let totalUsdtAmount = 0;
        console.log(`📊 Total USDT settlements: ${totalRecords}`);
        const fileName = `usdt_settlements_${Date.now()}.csv`;
        const filePath = path.join(EXPORT_DIR, fileName);
        const fileStream = fs.createWriteStream(filePath);
        const csvStream = csv.format({ headers: true });
        csvStream.pipe(fileStream);
        const pageSize = 1000;
        let lastCursor = undefined;
        let hasMore = true;
        const timeZone = "Asia/Karachi";
        while (hasMore) {
            const batch = await prisma.uSDTSettlement.findMany({
                where: filters,
                orderBy: { id: "asc" },
                cursor: lastCursor ? { id: lastCursor } : undefined,
                skip: lastCursor ? 1 : 0,
                take: pageSize,
                include: {
                    merchant: { select: { username: true } }
                },
            });
            console.log(`🔄 Fetched batch: ${batch.length}`);
            remainingRecords -= batch.length;
            for (const txn of batch) {
                totalUsdtAmount += Number(txn.total_usdt || 0);
                csvStream.write({
                    merchant: txn.merchant?.username || "",
                    pkr_amount: txn.pkr_amount,
                    usdt_amount: txn.usdt_amount,
                    date: txn.date,
                    wallet_address: txn.wallet_address,
                    conversion_charges: txn.conversion_charges,
                    total_usdt: txn.total_usdt,
                    usdt_pkr_rate: txn.usdt_pkr_rate,
                });
                lastCursor = txn.id;
                processedCount++;
            }
            console.log(`📦 Processed: ${processedCount} | Remaining: ${remainingRecords} | Total USDT: ${totalUsdtAmount.toFixed(2)}`);
            hasMore = batch.length === pageSize;
        }
        await new Promise(resolve => csvStream.end(resolve));
        fs.appendFileSync(filePath, `\nTotal USDT Amount,,${totalUsdtAmount.toFixed(2)}`);
        console.log(`✅ USDT CSV saved at: ${filePath}`);
        return {
            filePath,
            downloadUrl: `https://server2.sahulatpay.com/files/${fileName}`,
            totalRecords: processedCount,
            totalUsdtAmount: totalUsdtAmount.toFixed(2),
        };
    }
    catch (error) {
        console.error("❌ USDT export failed:", error);
        throw new CustomError(error?.error || "Unable to export USDT settlements", error?.statusCode || 500);
    }
};
export default {
    getUsdtSettlements,
    exportUsdtSettlements
};
