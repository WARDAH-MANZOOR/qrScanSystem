import path from "path";
import ExcelJS from "exceljs";
import prisma from "prisma/client.js";
import { JsonObject } from "@prisma/client/runtime/library";
import { toZonedTime, format } from "date-fns-tz"; // For time zone conversion
import { parseISO } from "date-fns";
import CustomError from "utils/custom_error.js";

const TIMEZONE = "Asia/Karachi"; // Pakistan Time Zone

export const generateExcelReportService = async (params: any): Promise<string> => {
    let customWhere = {
        date_time: {}
    };
    let disbursementDateWhere: any = {};
    const startDate = params?.start?.replace(" ", "+");
    const endDate = params?.end?.replace(" ", "+");
    if (startDate && endDate) {
        const todayStart = parseISO(startDate as string);
        const todayEnd = parseISO(endDate as string);

        customWhere["date_time"] = {
            gte: todayStart,
            lt: todayEnd,
        };
        disbursementDateWhere = customWhere["date_time"]
    }

    // Fetch merchants and their commissions
    const [merchants, transactions, disbursements] = await Promise.all([
        prisma.merchant.findMany({
            include: {
                commissions: {
                    select: {
                        commissionMode: true,
                        commissionRate: true,
                        easypaisaRate: true,
                        commissionGST: true,
                        commissionWithHoldingTax: true,
                        disbursementRate: true,
                        disbursementGST: true,
                        disbursementWithHoldingTax: true,
                    },
                },
            },
        }),
        prisma.transaction.findMany({
            where: {
                date_time: customWhere["date_time"],
                status: "completed",
            },
            select: {
                merchant_id: true,
                original_amount: true,
                providerDetails: true,
                date_time: true,
            },
        }),
        prisma.disbursement.findMany({
            where: {
                disbursementDate: disbursementDateWhere,
                status: "completed",
            },
            select: {
                merchant_id: true,
                transactionAmount: true,
                disbursementDate: true,
                commission: true
            },
        })
    ]);

    // Collect all unique dates across all merchants
    const allDatesSet = new Set<string>();
    transactions.forEach((txn) => {
        const pktDate = format(toZonedTime(txn.date_time, TIMEZONE), "yyyy-MM-dd");
        allDatesSet.add(pktDate);
    });
    disbursements.forEach((d) => {
        const pktDate = format(toZonedTime(d.disbursementDate, TIMEZONE), "yyyy-MM-dd");
        allDatesSet.add(pktDate);
    });
    const allDates = Array.from(allDatesSet).sort(); // Sorted unique dates
    // Process data for each merchant
    const merchantData = merchants.map((merchant) => {
        const merchantTransactions = transactions.filter(
            (txn) => txn.merchant_id === merchant.merchant_id
        );

        const merchantDisbursements = disbursements.filter(
            (d) => d.merchant_id === merchant.merchant_id
        );

        // Group transactions and disbursements by day (in PKT)
        const dailyData: Record<string, { Easypaisa: number; JazzCash: number; Disbursement: number; DisbursementCommission: number }> = {};

        merchantTransactions.forEach((txn) => {
            const pktDate = format(toZonedTime(txn.date_time, TIMEZONE), "yyyy-MM-dd");
            if (!dailyData[pktDate]) {
                dailyData[pktDate] = { Easypaisa: 0, JazzCash: 0, Disbursement: 0, DisbursementCommission: 0 };
            }

            if (
                txn.providerDetails &&
                ((txn.providerDetails as JsonObject)?.name as string)?.includes("Easypaisa")
            ) {
                if (txn.original_amount !== null) {
                    dailyData[pktDate].Easypaisa += +txn.original_amount;
                }
            } else if (
                txn.providerDetails &&
                ((txn.providerDetails as JsonObject)?.name as string)?.includes("JazzCash")
            ) {
                if (txn.original_amount !== null) {
                    dailyData[pktDate].JazzCash += +txn.original_amount;
                }
            }
        });

        merchantDisbursements.forEach((d) => {
            const pktDate = format(toZonedTime(d.disbursementDate, TIMEZONE), "yyyy-MM-dd");

            if (!dailyData[pktDate]) {
                dailyData[pktDate] = { Easypaisa: 0, JazzCash: 0, Disbursement: 0, DisbursementCommission: 0 };
            }

            dailyData[pktDate].Disbursement += +d.transactionAmount;
            dailyData[pktDate].DisbursementCommission += +d.commission
        });

        // Calculate commissions for each day
        const {
            commissionMode,
            commissionRate,
            easypaisaRate,
            commissionGST,
            commissionWithHoldingTax,
            disbursementRate,
            disbursementGST,
            disbursementWithHoldingTax,
        } = merchant.commissions[0] || {};
        const dailyCommissions = Object.keys(dailyData).reduce((result, dateKey) => {
            const daily = dailyData[dateKey];
            result[dateKey] = {
                Easypaisa:
                    commissionMode === "SINGLE"
                        ? (daily.Easypaisa *
                            (Number(commissionRate) +
                                Number(commissionGST) +
                                Number(commissionWithHoldingTax)))
                        : (daily.Easypaisa *
                            (Number(easypaisaRate ?? 0) +
                                Number(commissionGST) +
                                Number(commissionWithHoldingTax))),
                JazzCash:
                    commissionMode === "SINGLE"
                        ? (daily.JazzCash *
                            (Number(commissionRate) +
                                Number(commissionGST) +
                                Number(commissionWithHoldingTax)))
                        : (daily.JazzCash *
                            (Number(commissionRate) +
                                Number(commissionGST) +
                                Number(commissionWithHoldingTax))),
                Disbursement:
                    daily.DisbursementCommission,
            };
            return result;
        }, {} as Record<string, { Easypaisa: number; JazzCash: number; Disbursement: number }>);

        return {
            name: merchant.full_name,
            dailyData,
            dailyCommissions,
        };
    });

    // Generate Excel report
    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
        filename: path.join(process.cwd(), "src/services/reports", `merchant_report_${Date.now()}.xlsx`)
    });
    const sheet = workbook.addWorksheet("Merchant Report");

    // Styles
    const headerStyle = {
        font: { bold: true, size: 12 },
        alignment: { horizontal: "center" as const },
        fill: { type: "pattern" as const, pattern: "solid" as ExcelJS.FillPatterns, fgColor: { argb: "DDEBF7" } },
    };

    const subHeaderStyle = {
        font: { bold: true },
        alignment: { horizontal: "left" as const },
        fill: { type: "pattern" as const, pattern: "solid" as ExcelJS.FillPatterns, fgColor: { argb: "BDD7EE" } },
    };

    const dataRowStyle = {
        fill: { type: "pattern" as const, pattern: "solid" as ExcelJS.FillPatterns, fgColor: { argb: "E2EFDA" } },
    };

    // Add headers
    console.log(merchantData)
    const headerRow = sheet.getRow(1);
    headerRow.getCell(1).value = "Merchant Name";
    allDates.forEach((date, index) => {
        headerRow.getCell(index + 2).value = date;
    });

    allDates.forEach((date, index) => {
        headerRow.getCell(index + 2).value = date;
    });
    headerRow.getCell(allDates.length + 2).value = ""; // Empty Column
    headerRow.getCell(allDates.length + 3).value = "Total"; // Total Column
    headerRow.eachCell((cell) => (cell.style = headerStyle));

    let rowIndex = 2;

    // Fill data for each merchant
    // Fill data for each merchant
    merchantData.forEach((merchant) => {
        const { name, dailyData, dailyCommissions } = merchant;

        // Merchant header
        const merchantHeaderRow = sheet.getRow(rowIndex);
        merchantHeaderRow.getCell(1).value = name;
        merchantHeaderRow.getCell(1).style = subHeaderStyle;
        rowIndex++;

        // Add PayIn Collection and Commission (Easypaisa + JazzCash)
        let totalPayInCollectionSum = 0;
        let totalPayInCommissionSum = 0;

        // Process PayIn Collection and Commission
        const payInCollectionRow = sheet.getRow(rowIndex);
        payInCollectionRow.getCell(1).value = `Total PayIn Collection`;
        let payInCollectionOverallTotal = 0;

        const payInCommissionRow = sheet.getRow(rowIndex + 1);
        payInCommissionRow.getCell(1).value = `Total PayIn Commission`;
        let payInCommissionOverallTotal = 0;

        allDates.forEach((date, index) => {
            const payInCollection =
                Math.abs((dailyData[date]?.Easypaisa || 0) + (dailyData[date]?.JazzCash || 0));
            const payInCommission =
                Math.abs((dailyCommissions[date]?.Easypaisa || 0) + (dailyCommissions[date]?.JazzCash || 0));

            // Fill PayIn Collection and Commission for each date
            payInCollectionRow.getCell(index + 2).value = payInCollection;
            payInCommissionRow.getCell(index + 2).value = payInCommission;

            // Update totals for "Total" column
            payInCollectionOverallTotal += payInCollection;
            payInCommissionOverallTotal += payInCommission;
        });

        // Fill overall totals in the "Total" column
        payInCollectionRow.getCell(allDates.length + 3).value = payInCollectionOverallTotal;
        payInCommissionRow.getCell(allDates.length + 3).value = payInCommissionOverallTotal;

        // Apply row styles
        payInCollectionRow.eachCell((cell) => (cell.style = dataRowStyle));
        payInCommissionRow.eachCell((cell) => (cell.style = dataRowStyle));

        // Update rowIndex for the next group
        rowIndex += 2;
        rowIndex++;

        // Add individual collection and commission rows (Easypaisa, JazzCash, Disbursement)
        (["Easypaisa", "JazzCash", "Disbursement"] as Array<
            "Easypaisa" | "JazzCash" | "Disbursement"
        >).forEach((type) => {
            const amountRow = sheet.getRow(rowIndex);
            amountRow.getCell(1).value = `${type} Amount`;
            let totalAmount = 0;

            allDates.forEach((date, index) => {
                const value = dailyData[date]?.[type] || 0;
                amountRow.getCell(index + 2).value = value;
                totalAmount += value;
            });

            amountRow.getCell(allDates.length + 3).value = totalAmount; // Total column
            amountRow.eachCell((cell) => (cell.style = dataRowStyle));
            rowIndex++;

            const commissionRow = sheet.getRow(rowIndex);
            commissionRow.getCell(1).value = `${type} Commission`;
            let totalCommission = 0;

            allDates.forEach((date, index) => {
                const value = dailyCommissions[date]?.[type] || 0;
                commissionRow.getCell(index + 2).value = value;
                totalCommission += value;
            });

            commissionRow.getCell(allDates.length + 3).value = totalCommission; // Total column
            commissionRow.eachCell((cell) => (cell.style = dataRowStyle));
            rowIndex++;

            // Add a blank row for spacing between groups
            rowIndex++;
        });

        // Add a blank row after each merchant for spacing
        rowIndex++;
    });

    // Adjust column widths
    sheet.columns = [
        { key: "merchantName", width: 25 },
        ...allDates.map(() => ({ width: 15 })),
        { width: 5 }, // Empty column
        { key: "total", width: 15 }, // Total column
    ];

    // Save the file
    const filePath = path.join(import.meta.dirname, "merchant_report.xlsx");
    // await workbook.xlsx.writeFile(filePath);
    await workbook.commit();

    return filePath;
};

export const payinPerWalletService = async (params: any) => {
    try {
        const { startDate, endDate } = params;
        let start_date, end_date;

        if (startDate && endDate) {
            start_date = new Date(format(toZonedTime(startDate, "Asia/Karachi"), 'yyyy-MM-dd HH:mm:ss', { timeZone: "Asia/Karachi" }));
            end_date = new Date(format(toZonedTime(endDate, "Asia/Karachi"), 'yyyy-MM-dd HH:mm:ss', { timeZone: "Asia/Karachi" }));
        }

        // 🧠 Let DB do the aggregation
        const [jazzCashAgg, easypaisaAgg] = await Promise.all([
            prisma.transaction.findMany({
                where: {
                    status: 'completed',
                    date_time: {
                        gte: start_date,
                        lt: end_date,
                    },
                    providerDetails: {
                        path: ['name'],
                        equals: 'JazzCash',
                    },
                },
                select: {
                    providerDetails: true,
                    original_amount: true,
                },
            }),
            prisma.transaction.findMany({
                where: {
                    status: 'completed',
                    date_time: { gte: start_date, lt: end_date },
                    providerDetails: { path: ['name'], equals: 'Easypaisa' },
                },
                select: {
                    providerDetails: true,
                    original_amount: true,
                    merchant_id: true,
                },
            }),
        ]);

        const jazzCashAggregation = jazzCashAgg.reduce((acc, t) => {
            const merchantId = Number((t.providerDetails as JsonObject)?.id);
            if (Number.isNaN(merchantId)) return acc;

            acc[merchantId] = acc[merchantId] || { total_amount: 0, provider_name: 'JazzCash' };
            acc[merchantId].total_amount += Number(t.original_amount);
            return acc;
        }, {} as Record<number, { total_amount: number; provider_name: string }>);

        // 🎯 Aggregate Easypaisa + Swich + PayFast
        const easypaisaAggMap: Record<number, { total_amount: number; provider_name: string }> = {};
        const swichAggMap: Record<number, { total_amount: number; provider_name: string }> = {};
        const payfastAggMap: Record<number, { total_amount: number; provider_name: string }> = {};

        for (const t of easypaisaAgg) {
            const provider = t.providerDetails as JsonObject;
            const providerId = Number(provider?.id);
            const subName = String(provider?.sub_name || '').toLowerCase();

            if (Number.isNaN(providerId)) continue;

            if ([2, 3].includes(providerId) || subName.includes("swich")) {
                swichAggMap[providerId] = swichAggMap[providerId] || { total_amount: 0, provider_name: 'Swich' };
                swichAggMap[providerId].total_amount += Number(t.original_amount);
            } else if (providerId === 5 || subName.includes("payfast")) {
                payfastAggMap[providerId] = payfastAggMap[providerId] || { total_amount: 0, provider_name: 'PayFast' };
                payfastAggMap[providerId].total_amount += Number(t.original_amount);
            } else {
                easypaisaAggMap[providerId] = easypaisaAggMap[providerId] || { total_amount: 0, provider_name: 'Easypaisa' };
                easypaisaAggMap[providerId].total_amount += Number(t.original_amount);
            }
        }
        
        // 🧾 Prepare merchant ID arrays
        const jazzCashIds = Object.keys(jazzCashAggregation).map(Number);
        const easypaisaIds = Object.keys(easypaisaAggMap).map(Number);
        const swichIds = Object.keys(swichAggMap).map(Number);
        const payfastIds = Object.keys(payfastAggMap).map(Number);
        console.log(jazzCashAggregation)
        
        // 🧵 Fetch all merchants in parallel
        const [jazzCashMerchants, easypaisaMerchants, swichMerchants, payfastMerchants] = await Promise.all([
            prisma.jazzCashMerchant.findMany({ where: { id: { in: jazzCashIds } }, select: { id: true, returnUrl: true } }),
            prisma.easyPaisaMerchant.findMany({ where: { id: { in: easypaisaIds } }, select: { id: true, username: true } }),
            prisma.swichMerchant.findMany({ where: { id: { in: swichIds } }, select: { id: true } }),
            prisma.payFastMerchant.findMany({ where: { id: { in: payfastIds } }, select: { id: true, name: true } }),
        ]);

        // 🧱 Format results
        const jazzCashResult = jazzCashMerchants.map((m) => ({
            returnUrl: m.returnUrl,
            total_amount: jazzCashAggregation[m.id]?.total_amount || 0,
            provider_name: 'JazzCash',
        }));

        const easyPaisaResult = easypaisaMerchants.map((m) => ({
            username: m.username,
            total_amount: easypaisaAggMap[m.id]?.total_amount || 0,
            provider_name: 'Easypaisa',
        }));

        const swichResult = swichMerchants.map((m) => ({
            id: m.id,
            total_amount: swichAggMap[m.id]?.total_amount || 0,
            provider_name: 'Swich',
        }));

        const payfastResult = payfastMerchants.map((m) => ({
            name: m.name,
            total_amount: payfastAggMap[m.id]?.total_amount || 0,
            provider_name: 'PayFast',
        }));

        return {
            jazzCashTransactions: jazzCashResult,
            easyPaisaTransactions: easyPaisaResult,
            swichTransactions: swichResult,
            payfastTransactions: payfastResult,
        };
    } catch (error) {
        console.error(error);
        throw new CustomError("Internal Server Error", 400);
    }
};



export default {
    generateExcelReportService,
    payinPerWalletService
}