import path from "path";
import ExcelJS from "exceljs";
import prisma from "prisma/client.js";
import { JsonObject } from "@prisma/client/runtime/library";

const generateExcelReportService = async (): Promise<string> => {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    // Fetch merchants and their commissions
    const merchants = await prisma.merchant.findMany({
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
    });

    // Fetch transactions in bulk
    const transactions = await prisma.transaction.findMany({
        where: {
            createdAt: { gte: last30Days },
            status: "completed",
        },
        select: {
            merchant_id: true,
            original_amount: true,
            providerDetails: true,
            createdAt: true,
        },
    });

    // Fetch disbursements in bulk
    const disbursements = await prisma.disbursement.findMany({
        where: {
            createdAt: { gte: last30Days },
            status: "completed",
        },
        select: {
            merchant_id: true,
            transactionAmount: true,
            createdAt: true,
        },
    });

    // Process data for each merchant
    const merchantData = merchants.map((merchant) => {
        const merchantTransactions = transactions.filter(
            (txn) => txn.merchant_id === merchant.merchant_id
        );

        const merchantDisbursements = disbursements.filter(
            (d) => d.merchant_id === merchant.merchant_id
        );

        // Group transactions and disbursements by day
        const dailyData: Record<string, { Easypaisa: number; JazzCash: number; Disbursement: number }> = {};

        merchantTransactions.forEach((txn) => {
            const dateKey = txn.createdAt.toISOString().split("T")[0];

            if (!dailyData[dateKey]) {
                dailyData[dateKey] = { Easypaisa: 0, JazzCash: 0, Disbursement: 0 };
            }

            if (
                txn.providerDetails &&
                ((txn.providerDetails as JsonObject)?.name as string)?.includes("Easypaisa")
            ) {
                if (txn.original_amount !== null) {
                    dailyData[dateKey].Easypaisa += +txn.original_amount;
                }
            } else if (
                txn.providerDetails &&
                ((txn.providerDetails as JsonObject)?.name as string)?.includes("JazzCash")
            ) {
                if (txn.original_amount !== null) {
                    dailyData[dateKey].JazzCash += +txn.original_amount;
                }
            }
        });

        merchantDisbursements.forEach((d) => {
            const dateKey = d.createdAt.toISOString().split("T")[0];

            if (!dailyData[dateKey]) {
                dailyData[dateKey] = { Easypaisa: 0, JazzCash: 0, Disbursement: 0 };
            }

            dailyData[dateKey].Disbursement += +d.transactionAmount;
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
                                Number(commissionWithHoldingTax))) /
                        100
                        : (daily.Easypaisa *
                            (Number(easypaisaRate ?? 0) +
                                Number(commissionGST) +
                                Number(commissionWithHoldingTax))) /
                        100,
                JazzCash:
                    commissionMode === "SINGLE"
                        ? (daily.JazzCash *
                            (Number(commissionRate) +
                                Number(commissionGST) +
                                Number(commissionWithHoldingTax))) /
                        100
                        : (daily.JazzCash *
                            (Number(commissionRate) +
                                Number(commissionGST) +
                                Number(commissionWithHoldingTax))) /
                        100,
                Disbursement:
                    (daily.Disbursement *
                        (Number(disbursementRate) +
                            Number(disbursementGST) +
                            Number(disbursementWithHoldingTax))) /
                    100,
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
    const workbook = new ExcelJS.Workbook();
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
    const headerRow = sheet.getRow(1);
    headerRow.getCell(1).value = "Merchant Name";
    const uniqueDates = Array.from(
        new Set(
            transactions
                .map((txn) => txn.createdAt.toISOString().split("T")[0])
                .concat(
                    disbursements.map((d) => d.createdAt.toISOString().split("T")[0])
                )
        )
    ).sort();

    uniqueDates.forEach((date, index) => {
        headerRow.getCell(index + 2).value = date;
    });
    headerRow.eachCell((cell) => (cell.style = headerStyle));

    let rowIndex = 2;

    // Fill data for each merchant
    merchantData.forEach((merchant) => {
        const { name, dailyData, dailyCommissions } = merchant;

        // Merchant header
        const merchantHeaderRow = sheet.getRow(rowIndex);
        merchantHeaderRow.getCell(1).value = name;
        merchantHeaderRow.getCell(1).style = subHeaderStyle;
        rowIndex++;

        (["Easypaisa", "JazzCash", "Disbursement"] as Array<"Easypaisa" | "JazzCash" | "Disbursement">).forEach((type) => {
            const amountRow = sheet.getRow(rowIndex);
            amountRow.getCell(1).value = `${type} Amount`;
            uniqueDates.forEach((date, index) => {
                amountRow.getCell(index + 2).value = dailyData[date]?.[type] || 0;
            });
            amountRow.eachCell((cell) => (cell.style = dataRowStyle));
            rowIndex++;

            const commissionRow = sheet.getRow(rowIndex);
            commissionRow.getCell(1).value = `${type} Commission`;
            uniqueDates.forEach((date, index) => {
                commissionRow.getCell(index + 2).value =
                    dailyCommissions[date]?.[type] || 0;
            });
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
        ...uniqueDates.map(() => ({ width: 15 })),
    ];

    // Save the file
    const filePath = path.join(import.meta.dirname, "merchant_report.xlsx");
    await workbook.xlsx.writeFile(filePath);

    return filePath;
};

export default {
    generateExcelReportService
}