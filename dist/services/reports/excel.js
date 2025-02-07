import path from "path";
import ExcelJS from "exceljs";
import prisma from "prisma/client.js";
import { toZonedTime, format } from "date-fns-tz"; // For time zone conversion
const TIMEZONE = "Asia/Karachi"; // Pakistan Time Zone
export const generateExcelReportService = async () => {
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
            date_time: { gte: last30Days },
            status: "completed",
        },
        select: {
            merchant_id: true,
            original_amount: true,
            providerDetails: true,
            date_time: true,
        },
    });
    // Fetch disbursements in bulk
    const disbursements = await prisma.disbursement.findMany({
        where: {
            disbursementDate: { gte: last30Days },
            status: "completed",
        },
        select: {
            merchant_id: true,
            transactionAmount: true,
            disbursementDate: true,
        },
    });
    // Collect all unique dates across all merchants
    const allDatesSet = new Set();
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
        const merchantTransactions = transactions.filter((txn) => txn.merchant_id === merchant.merchant_id);
        const merchantDisbursements = disbursements.filter((d) => d.merchant_id === merchant.merchant_id);
        // Group transactions and disbursements by day (in PKT)
        const dailyData = {};
        merchantTransactions.forEach((txn) => {
            const pktDate = format(toZonedTime(txn.date_time, TIMEZONE), "yyyy-MM-dd");
            if (!dailyData[pktDate]) {
                dailyData[pktDate] = { Easypaisa: 0, JazzCash: 0, Disbursement: 0 };
            }
            if (txn.providerDetails &&
                txn.providerDetails?.name?.includes("Easypaisa")) {
                if (txn.original_amount !== null) {
                    dailyData[pktDate].Easypaisa += +txn.original_amount;
                }
            }
            else if (txn.providerDetails &&
                txn.providerDetails?.name?.includes("JazzCash")) {
                if (txn.original_amount !== null) {
                    dailyData[pktDate].JazzCash += +txn.original_amount;
                }
            }
        });
        merchantDisbursements.forEach((d) => {
            const pktDate = format(toZonedTime(d.disbursementDate, TIMEZONE), "yyyy-MM-dd");
            if (!dailyData[pktDate]) {
                dailyData[pktDate] = { Easypaisa: 0, JazzCash: 0, Disbursement: 0 };
            }
            dailyData[pktDate].Disbursement += +d.transactionAmount;
        });
        // Calculate commissions for each day
        const { commissionMode, commissionRate, easypaisaRate, commissionGST, commissionWithHoldingTax, disbursementRate, disbursementGST, disbursementWithHoldingTax, } = merchant.commissions[0] || {};
        const dailyCommissions = Object.keys(dailyData).reduce((result, dateKey) => {
            const daily = dailyData[dateKey];
            result[dateKey] = {
                Easypaisa: commissionMode === "SINGLE"
                    ? (daily.Easypaisa *
                        (Number(commissionRate) +
                            Number(commissionGST) +
                            Number(commissionWithHoldingTax)))
                    : (daily.Easypaisa *
                        (Number(easypaisaRate ?? 0) +
                            Number(commissionGST) +
                            Number(commissionWithHoldingTax))),
                JazzCash: commissionMode === "SINGLE"
                    ? (daily.JazzCash *
                        (Number(commissionRate) +
                            Number(commissionGST) +
                            Number(commissionWithHoldingTax)))
                    : (daily.JazzCash *
                        (Number(commissionRate) +
                            Number(commissionGST) +
                            Number(commissionWithHoldingTax))),
                Disbursement: (daily.Disbursement *
                    (Number(disbursementRate) +
                        Number(disbursementGST) +
                        Number(disbursementWithHoldingTax))),
            };
            return result;
        }, {});
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
        alignment: { horizontal: "center" },
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: "DDEBF7" } },
    };
    const subHeaderStyle = {
        font: { bold: true },
        alignment: { horizontal: "left" },
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: "BDD7EE" } },
    };
    const dataRowStyle = {
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: "E2EFDA" } },
    };
    // Add headers
    console.log(merchantData);
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
            const payInCollection = Math.abs((dailyData[date]?.Easypaisa || 0) + (dailyData[date]?.JazzCash || 0));
            const payInCommission = Math.abs((dailyCommissions[date]?.Easypaisa || 0) + (dailyCommissions[date]?.JazzCash || 0));
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
        ["Easypaisa", "JazzCash", "Disbursement"].forEach((type) => {
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
    await workbook.xlsx.writeFile(filePath);
    return filePath;
};
export default {
    generateExcelReportService
};
