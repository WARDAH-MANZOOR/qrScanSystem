import path from "path";
import ExcelJS from "exceljs";
import prisma from "prisma/client.js";
import { toZonedTime, format } from "date-fns-tz"; // For time zone conversion
import { parseISO } from "date-fns";
import CustomError from "utils/custom_error.js";
import { PROVIDERS } from "constants/providers.js";
const TIMEZONE = "Asia/Karachi"; // Pakistan Time Zone
// export const generateExcelReportService = async (params: any): Promise<string> => {
//     let customWhere = {
//         date_time: {}
//     };
//     let disbursementDateWhere: any = {};
//     const startDate = params?.start?.replace(" ", "+");
//     const endDate = params?.end?.replace(" ", "+");
//     if (startDate && endDate) {
//         const todayStart = parseISO(startDate as string);
//         const todayEnd = parseISO(endDate as string);
//         customWhere["date_time"] = {
//             gte: todayStart,
//             lt: todayEnd,
//         };
//         disbursementDateWhere = customWhere["date_time"]
//     }
//     //  2. Parallel Data Fetching Using Promise.all.----Fetch merchants, transactions, and disbursements in parallel.
//     const [merchants, transactions, disbursements] = await Promise.all([
//         prisma.merchant.findMany({
//             include: {
//                 commissions: {
//                     select: {
//                         commissionMode: true,
//                         commissionRate: true,
//                         easypaisaRate: true,
//                         commissionGST: true,
//                         commissionWithHoldingTax: true,
//                         disbursementRate: true,
//                         disbursementGST: true,
//                         disbursementWithHoldingTax: true,
//                     },
//                 },
//             },
//         }),
//         prisma.transaction.findMany({
//             where: {
//                 date_time: customWhere["date_time"],
//                 status: "completed",
//             },
//             select: {
//                 merchant_id: true,
//                 original_amount: true,
//                 providerDetails: true,
//                 date_time: true,
//             },
//         }),
//         prisma.disbursement.findMany({
//             where: {
//                 disbursementDate: disbursementDateWhere,
//                 status: "completed",
//             },
//             select: {
//                 merchant_id: true,
//                 transactionAmount: true,
//                 disbursementDate: true,
//                 commission: true,
//             },
//         }),
//     ]);
//     // // Fetch merchants and their commissions
//     // const merchants = await prisma.merchant.findMany({
//     //     include: {
//     //         commissions: {
//     //             select: {
//     //                 commissionMode: true,
//     //                 commissionRate: true,
//     //                 easypaisaRate: true,
//     //                 commissionGST: true,
//     //                 commissionWithHoldingTax: true,
//     //                 disbursementRate: true,
//     //                 disbursementGST: true,
//     //                 disbursementWithHoldingTax: true,
//     //             },
//     //         },
//     //     },
//     // });
//     // // Fetch transactions in bulk
//     // const transactions = await prisma.transaction.findMany({
//     //     where: {
//     //         date_time: customWhere["date_time"],
//     //         status: "completed",
//     //     },
//     //     select: {
//     //         merchant_id: true,
//     //         original_amount: true,
//     //         providerDetails: true,
//     //         date_time: true,
//     //     },
//     // });
//     // // Fetch disbursements in bulk
//     // const disbursements = await prisma.disbursement.findMany({
//     //     where: {
//     //         disbursementDate: disbursementDateWhere,
//     //         status: "completed",
//     //     },
//     //     select: {
//     //         merchant_id: true,
//     //         transactionAmount: true,
//     //         disbursementDate: true,
//     //         commission: true
//     //     },
//     // });
//     // Collect all unique dates across all merchants
//     const allDatesSet = new Set<string>();
//     transactions.forEach((txn) => {
//         const pktDate = format(toZonedTime(txn.date_time, TIMEZONE), "yyyy-MM-dd");
//         allDatesSet.add(pktDate);
//     });
//     disbursements.forEach((d) => {
//         const pktDate = format(toZonedTime(d.disbursementDate, TIMEZONE), "yyyy-MM-dd");
//         allDatesSet.add(pktDate);
//     });
//     const allDates = Array.from(allDatesSet).sort(); // Sorted unique dates
//     // Process data for each merchant
//     const merchantData = merchants.map((merchant) => {
//         const merchantTransactions = transactions.filter(
//             (txn) => txn.merchant_id === merchant.merchant_id
//         );
//         const merchantDisbursements = disbursements.filter(
//             (d) => d.merchant_id === merchant.merchant_id
//         );
//         // Group transactions and disbursements by day (in PKT)
//         const dailyData: Record<string, { Easypaisa: number; JazzCash: number; Disbursement: number; DisbursementCommission: number }> = {};
//         merchantTransactions.forEach((txn) => {
//             const pktDate = format(toZonedTime(txn.date_time, TIMEZONE), "yyyy-MM-dd");
//             if (!dailyData[pktDate]) {
//                 dailyData[pktDate] = { Easypaisa: 0, JazzCash: 0, Disbursement: 0, DisbursementCommission: 0 };
//             }
//             if (
//                 txn.providerDetails &&
//                 ((txn.providerDetails as JsonObject)?.name as string)?.includes("Easypaisa")
//             ) {
//                 if (txn.original_amount !== null) {
//                     dailyData[pktDate].Easypaisa += +txn.original_amount;
//                 }
//             } else if (
//                 txn.providerDetails &&
//                 ((txn.providerDetails as JsonObject)?.name as string)?.includes("JazzCash")
//             ) {
//                 if (txn.original_amount !== null) {
//                     dailyData[pktDate].JazzCash += +txn.original_amount;
//                 }
//             }
//         });
//         merchantDisbursements.forEach((d) => {
//             const pktDate = format(toZonedTime(d.disbursementDate, TIMEZONE), "yyyy-MM-dd");
//             if (!dailyData[pktDate]) {
//                 dailyData[pktDate] = { Easypaisa: 0, JazzCash: 0, Disbursement: 0, DisbursementCommission: 0 };
//             }
//             dailyData[pktDate].Disbursement += +d.transactionAmount;
//             dailyData[pktDate].DisbursementCommission += +d.commission
//         });
//         // Calculate commissions for each day
//         const {
//             commissionMode,
//             commissionRate,
//             easypaisaRate,
//             commissionGST,
//             commissionWithHoldingTax,
//             disbursementRate,
//             disbursementGST,
//             disbursementWithHoldingTax,
//         } = merchant.commissions[0] || {};
//         const dailyCommissions = Object.keys(dailyData).reduce((result, dateKey) => {
//             const daily = dailyData[dateKey];
//             result[dateKey] = {
//                 Easypaisa:
//                     commissionMode === "SINGLE"
//                         ? (daily.Easypaisa *
//                             (Number(commissionRate) +
//                                 Number(commissionGST) +
//                                 Number(commissionWithHoldingTax)))
//                         : (daily.Easypaisa *
//                             (Number(easypaisaRate ?? 0) +
//                                 Number(commissionGST) +
//                                 Number(commissionWithHoldingTax))),
//                 JazzCash:
//                     commissionMode === "SINGLE"
//                         ? (daily.JazzCash *
//                             (Number(commissionRate) +
//                                 Number(commissionGST) +
//                                 Number(commissionWithHoldingTax)))
//                         : (daily.JazzCash *
//                             (Number(commissionRate) +
//                                 Number(commissionGST) +
//                                 Number(commissionWithHoldingTax))),
//                 Disbursement:
//                     daily.DisbursementCommission,
//             };
//             return result;
//         }, {} as Record<string, { Easypaisa: number; JazzCash: number; Disbursement: number }>);
//         return {
//             name: merchant.full_name,
//             dailyData,
//             dailyCommissions,
//         };
//     });
//     // Generate Excel report
//     // const workbook = new ExcelJS.Workbook();
//     // const sheet = workbook.addWorksheet("Merchant Report");
//     // Use Streams for Writing Large Excel Files  ---- This reduces memory footprint drastically by streaming instead of buffering 
//     // the entire workbook in memory.ExcelJS can use a stream writer to avoid loading everything into memory.
//     const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
//         filename: path.join(process.cwd(), "src/services/reports", `merchant_report_${Date.now()}.xlsx`)
//     });
//     const sheet = workbook.addWorksheet("Merchant Report");
//     // Styles
//     const headerStyle = {
//         font: { bold: true, size: 12 },
//         alignment: { horizontal: "center" as const },
//         fill: { type: "pattern" as const, pattern: "solid" as ExcelJS.FillPatterns, fgColor: { argb: "DDEBF7" } },
//     };
//     const subHeaderStyle = {
//         font: { bold: true },
//         alignment: { horizontal: "left" as const },
//         fill: { type: "pattern" as const, pattern: "solid" as ExcelJS.FillPatterns, fgColor: { argb: "BDD7EE" } },
//     };
//     const dataRowStyle = {
//         fill: { type: "pattern" as const, pattern: "solid" as ExcelJS.FillPatterns, fgColor: { argb: "E2EFDA" } },
//     };
//     // Add headers
//     // console.log(merchantData)
//     const headerRow = sheet.getRow(1);
//     headerRow.getCell(1).value = "Merchant Name";
//     allDates.forEach((date, index) => {
//         headerRow.getCell(index + 2).value = date;
//     });
//     allDates.forEach((date, index) => {
//         headerRow.getCell(index + 2).value = date;
//     });
//     headerRow.getCell(allDates.length + 2).value = ""; // Empty Column
//     headerRow.getCell(allDates.length + 3).value = "Total"; // Total Column
//     headerRow.eachCell((cell) => (cell.style = headerStyle));
//     let rowIndex = 2;
//     // Fill data for each merchant
//     // Fill data for each merchant
//     merchantData.forEach((merchant) => {
//         const { name, dailyData, dailyCommissions } = merchant;
//         // Merchant header
//         const merchantHeaderRow = sheet.getRow(rowIndex);
//         merchantHeaderRow.getCell(1).value = name;
//         merchantHeaderRow.getCell(1).style = subHeaderStyle;
//         rowIndex++;
//         // Add PayIn Collection and Commission (Easypaisa + JazzCash)
//         let totalPayInCollectionSum = 0;
//         let totalPayInCommissionSum = 0;
//         // Process PayIn Collection and Commission
//         const payInCollectionRow = sheet.getRow(rowIndex);
//         payInCollectionRow.getCell(1).value = `Total PayIn Collection`;
//         let payInCollectionOverallTotal = 0;
//         const payInCommissionRow = sheet.getRow(rowIndex + 1);
//         payInCommissionRow.getCell(1).value = `Total PayIn Commission`;
//         let payInCommissionOverallTotal = 0;
//         allDates.forEach((date, index) => {
//             const payInCollection =
//                 Math.abs((dailyData[date]?.Easypaisa || 0) + (dailyData[date]?.JazzCash || 0));
//             const payInCommission =
//                 Math.abs((dailyCommissions[date]?.Easypaisa || 0) + (dailyCommissions[date]?.JazzCash || 0));
//             // Fill PayIn Collection and Commission for each date
//             payInCollectionRow.getCell(index + 2).value = payInCollection;
//             payInCommissionRow.getCell(index + 2).value = payInCommission;
//             // Update totals for "Total" column
//             payInCollectionOverallTotal += payInCollection;
//             payInCommissionOverallTotal += payInCommission;
//         });
//         // Fill overall totals in the "Total" column
//         payInCollectionRow.getCell(allDates.length + 3).value = payInCollectionOverallTotal;
//         payInCommissionRow.getCell(allDates.length + 3).value = payInCommissionOverallTotal;
//         // Apply row styles
//         payInCollectionRow.eachCell((cell) => (cell.style = dataRowStyle));
//         payInCommissionRow.eachCell((cell) => (cell.style = dataRowStyle));
//         // Update rowIndex for the next group
//         rowIndex += 2;
//         rowIndex++;
//         // Add individual collection and commission rows (Easypaisa, JazzCash, Disbursement)
//         (["Easypaisa", "JazzCash", "Disbursement"] as Array<
//             "Easypaisa" | "JazzCash" | "Disbursement"
//         >).forEach((type) => {
//             const amountRow = sheet.getRow(rowIndex);
//             amountRow.getCell(1).value = `${type} Amount`;
//             let totalAmount = 0;
//             allDates.forEach((date, index) => {
//                 const value = dailyData[date]?.[type] || 0;
//                 amountRow.getCell(index + 2).value = value;
//                 totalAmount += value;
//             });
//             amountRow.getCell(allDates.length + 3).value = totalAmount; // Total column
//             amountRow.eachCell((cell) => (cell.style = dataRowStyle));
//             rowIndex++;
//             const commissionRow = sheet.getRow(rowIndex);
//             commissionRow.getCell(1).value = `${type} Commission`;
//             let totalCommission = 0;
//             allDates.forEach((date, index) => {
//                 const value = dailyCommissions[date]?.[type] || 0;
//                 commissionRow.getCell(index + 2).value = value;
//                 totalCommission += value;
//             });
//             commissionRow.getCell(allDates.length + 3).value = totalCommission; // Total column
//             commissionRow.eachCell((cell) => (cell.style = dataRowStyle));
//             rowIndex++;
//             // Add a blank row for spacing between groups
//             rowIndex++;
//         });
//         // Add a blank row after each merchant for spacing
//         rowIndex++;
//     });
//     // Adjust column widths
//     sheet.columns = [
//         { key: "merchantName", width: 25 },
//         ...allDates.map(() => ({ width: 15 })),
//         { width: 5 }, // Empty column
//         { key: "total", width: 15 }, // Total column
//     ];
//     // Save the file
//     const filePath = path.join(import.meta.dirname, "merchant_report.xlsx");
//     // await workbook.xlsx.writeFile(filePath);
//     await workbook.commit();
//     return filePath;
// };
// export const generateExcelReportService = async (params: any): Promise<string> => {
//     let customWhere = { date_time: {} };
//     let disbursementDateWhere: any = {};
//     const startDate = params?.start?.replace(" ", "+");
//     const endDate = params?.end?.replace(" ", "+");
//     if (startDate && endDate) {
//         const todayStart = parseISO(startDate as string);
//         const todayEnd = parseISO(endDate as string);
//         customWhere["date_time"] = { gte: todayStart, lt: todayEnd };
//         disbursementDateWhere = customWhere["date_time"];
//     }
//     // Fetch all merchants (assuming merchants are not in huge volume)
//     const merchants = await prisma.merchant.findMany({
//         include: {
//             commissions: {
//                 select: {
//                     commissionMode: true,
//                     commissionRate: true,
//                     easypaisaRate: true,
//                     commissionGST: true,
//                     commissionWithHoldingTax: true,
//                     disbursementRate: true,
//                     disbursementGST: true,
//                     disbursementWithHoldingTax: true
//                 }
//             }
//         }
//     });
//     // Fetch paginated transactions
//     const pageSize = 10000;
//     const totalPagesTransactions = Math.ceil(await prisma.transaction.count({
//         where: { date_time: customWhere["date_time"], status: "completed" }
//     }) / pageSize);
//     const pagesTransactions = [...Array(totalPagesTransactions).keys()];
//     const fetchedTransactions = await Promise.all(
//         pagesTransactions.map((page) =>
//             prisma.transaction.findMany({
//                 where: { date_time: customWhere["date_time"], status: "completed" },
//                 skip: page * pageSize,
//                 take: pageSize,
//                 select: {
//                     merchant_id: true,
//                     original_amount: true,
//                     providerDetails: true,
//                     date_time: true
//                 }
//             })
//         )
//     );
//     const transactions = fetchedTransactions.flat();
//     // Fetch paginated disbursements
//     const totalPagesDisbursements = Math.ceil(await prisma.disbursement.count({
//         where: { disbursementDate: disbursementDateWhere, status: "completed" }
//     }) / pageSize);
//     const pagesDisbursements = [...Array(totalPagesDisbursements).keys()];
//     const fetchedDisbursements = await Promise.all(
//         pagesDisbursements.map((page) =>
//             prisma.disbursement.findMany({
//                 where: { disbursementDate: disbursementDateWhere, status: "completed" },
//                 skip: page * pageSize,
//                 take: pageSize,
//                 select: {
//                     merchant_id: true,
//                     transactionAmount: true,
//                     disbursementDate: true,
//                     commission: true
//                 }
//             })
//         )
//     );
//     const disbursements = fetchedDisbursements.flat();
//     // Group transactions and disbursements by merchant_id upfront
//     const transactionsByMerchant = new Map();
//     transactions.forEach(txn => {
//         if (!transactionsByMerchant.has(txn.merchant_id)) {
//             transactionsByMerchant.set(txn.merchant_id, []);
//         }
//         transactionsByMerchant.get(txn.merchant_id).push(txn);
//     });
//     const disbursementsByMerchant = new Map();
//     disbursements.forEach(d => {
//         if (!disbursementsByMerchant.has(d.merchant_id)) {
//             disbursementsByMerchant.set(d.merchant_id, []);
//         }
//         disbursementsByMerchant.get(d.merchant_id).push(d);
//     });
//     // Collect all unique dates across all merchants
//     const allDatesSet = new Set<string>();
//     transactions.forEach((txn) => {
//         const pktDate = format(toZonedTime(txn.date_time, TIMEZONE), "yyyy-MM-dd");
//         allDatesSet.add(pktDate);
//     });
//     disbursements.forEach((d) => {
//         const pktDate = format(toZonedTime(d.disbursementDate, TIMEZONE), "yyyy-MM-dd");
//         allDatesSet.add(pktDate);
//     });
//     const allDates = Array.from(allDatesSet).sort(); // Sorted unique dates
//     // Process merchant data asynchronously
//     const merchantData = await Promise.all(
//         merchants.map(async (merchant) => {
//             const merchantTransactions = transactionsByMerchant.get(merchant.merchant_id) || [];
//             const merchantDisbursements = disbursementsByMerchant.get(merchant.merchant_id) || [];
//             const firstCommission = merchant.commissions?.[0];
//             const commissionMode = firstCommission?.commissionMode ?? "SINGLE"; // fallback to SINGLE
//             const commissionRate = Number(firstCommission?.commissionRate ?? 0);
//             const easypaisaRate = Number(firstCommission?.easypaisaRate ?? 0);
//             const commissionGST = Number(firstCommission?.commissionGST ?? 0);
//             const commissionWithHoldingTax = Number(firstCommission?.commissionWithHoldingTax ?? 0);
//             const commissionBaseRate = Number(commissionRate ?? 0);
//             const easypaisaBaseRate = Number(easypaisaRate ?? 0);
//             const gst = Number(commissionGST ?? 0);
//             const wht = Number(commissionWithHoldingTax ?? 0);
//             const dailyData: Record<string, {
//                 Easypaisa: number;
//                 JazzCash: number;
//                 Disbursement: number;
//                 DisbursementCommission: number;
//                 EasypaisaCommission?: number;
//                 JazzCashCommission?: number;
//             }> = {};
//             merchantTransactions.forEach((txn: {
//                 date_time: string | number | Date;
//                 providerDetails: { name: string };
//                 original_amount: string | number | null;
//             }) => {
//                 const pktDate = format(toZonedTime(txn.date_time, TIMEZONE), "yyyy-MM-dd");
//                 if (!dailyData[pktDate]) {
//                     dailyData[pktDate] = {
//                         Easypaisa: 0,
//                         JazzCash: 0,
//                         Disbursement: 0,
//                         DisbursementCommission: 0,
//                         EasypaisaCommission: 0,
//                         JazzCashCommission: 0,
//                     };
//                 }
//                 const providerName = txn.providerDetails?.name as string;
//                 const amount = Number(txn.original_amount ?? 0);
//                 if (providerName.includes("Easypaisa")) {
//                     dailyData[pktDate].Easypaisa += amount;
//                     const rate = commissionMode === "SINGLE"
//                         ? commissionBaseRate + gst + wht
//                         : easypaisaBaseRate + gst + wht;
//                     dailyData[pktDate].EasypaisaCommission! += amount * rate;
//                 } else if (providerName.includes("JazzCash")) {
//                     dailyData[pktDate].JazzCash += amount;
//                     const rate = commissionBaseRate + gst + wht;
//                     dailyData[pktDate].JazzCashCommission! += amount * rate;
//                 }
//             });
//             merchantDisbursements.forEach((d: {
//                 disbursementDate: string | number | Date;
//                 transactionAmount: string | number;
//                 commission: string | number;
//             }) => {
//                 const pktDate = format(toZonedTime(d.disbursementDate, TIMEZONE), "yyyy-MM-dd");
//                 if (!dailyData[pktDate]) {
//                     dailyData[pktDate] = {
//                         Easypaisa: 0,
//                         JazzCash: 0,
//                         Disbursement: 0,
//                         DisbursementCommission: 0,
//                     };
//                 }
//                 dailyData[pktDate].Disbursement += Number(d.transactionAmount);
//                 dailyData[pktDate].DisbursementCommission += Number(d.commission);
//             });
//             const dailyCommissions = Object.fromEntries(
//                 Object.entries(dailyData).map(([date, d]) => [
//                     date,
//                     {
//                         Easypaisa: d.EasypaisaCommission ?? 0,
//                         JazzCash: d.JazzCashCommission ?? 0,
//                         Disbursement: d.DisbursementCommission,
//                     },
//                 ])
//             );
//             // const dailyData: Record<string, { Easypaisa: number; JazzCash: number; Disbursement: number; DisbursementCommission: number }> = {};
//             // merchantTransactions.forEach((txn: { date_time: string | number | Date; providerDetails: { name: string; }; original_amount: string | number | null; }) => {
//             //     const pktDate = format(toZonedTime(txn.date_time, TIMEZONE), "yyyy-MM-dd");
//             //     if (!dailyData[pktDate]) {
//             //         dailyData[pktDate] = { Easypaisa: 0, JazzCash: 0, Disbursement: 0, DisbursementCommission: 0 };
//             //     }
//             //     const providerName = txn.providerDetails?.name as string;
//             //     if (providerName.includes("Easypaisa") && txn.original_amount !== null) {
//             //         dailyData[pktDate].Easypaisa += +txn.original_amount;
//             //     } else if (providerName.includes("JazzCash") && txn.original_amount !== null) {
//             //         dailyData[pktDate].JazzCash += +txn.original_amount;
//             //     }
//             // });
//             // merchantDisbursements.forEach((d: { disbursementDate: string | number | Date; transactionAmount: string | number; commission: string | number; }) => {
//             //     const pktDate = format(toZonedTime(d.disbursementDate, TIMEZONE), "yyyy-MM-dd");
//             //     if (!dailyData[pktDate]) {
//             //         dailyData[pktDate] = { Easypaisa: 0, JazzCash: 0, Disbursement: 0, DisbursementCommission: 0 };
//             //     }
//             //     dailyData[pktDate].Disbursement += +d.transactionAmount;
//             //     dailyData[pktDate].DisbursementCommission += +d.commission;
//             // });
//             // const { commissionMode, commissionRate, easypaisaRate, commissionGST, commissionWithHoldingTax } = merchant.commissions[0] || {};
//             // const dailyCommissions = Object.keys(dailyData).reduce((result, dateKey) => {
//             //     const daily = dailyData[dateKey];
//             //     result[dateKey] = {
//             //         Easypaisa: commissionMode === "SINGLE"
//             //             ? (daily.Easypaisa * (Number(commissionRate) + Number(commissionGST) + Number(commissionWithHoldingTax)))
//             //             : (daily.Easypaisa * (Number(easypaisaRate ?? 0) + Number(commissionGST) + Number(commissionWithHoldingTax))),
//             //         JazzCash: commissionMode === "SINGLE"
//             //             ? (daily.JazzCash * (Number(commissionRate) + Number(commissionGST) + Number(commissionWithHoldingTax)))
//             //             : (daily.JazzCash * (Number(commissionRate) + Number(commissionGST) + Number(commissionWithHoldingTax))),
//             //         Disbursement: daily.DisbursementCommission,
//             //     };
//             //     return result;
//             // }, {} as Record<string, { Easypaisa: number; JazzCash: number; Disbursement: number }>);
//             return {
//                 name: merchant.full_name,
//                 dailyData,
//                 dailyCommissions,
//             };
//         })
//     );
//     // Generate Excel report
//     const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
//         filename: path.join(process.cwd(), "src/services/reports", `merchant_report_${Date.now()}.xlsx`)
//     });
//     const sheet = workbook.addWorksheet("Merchant Report");
//     // Styles
//     const headerStyle = {
//         font: { bold: true, size: 12 },
//         alignment: { horizontal: "center" as const },
//         fill: { type: "pattern" as const, pattern: "solid" as ExcelJS.FillPatterns, fgColor: { argb: "DDEBF7" } },
//     };
//     const subHeaderStyle = {
//         font: { bold: true },
//         alignment: { horizontal: "left" as const },
//         fill: { type: "pattern" as const, pattern: "solid" as ExcelJS.FillPatterns, fgColor: { argb: "BDD7EE" } },
//     };
//     const dataRowStyle = {
//         fill: { type: "pattern" as const, pattern: "solid" as ExcelJS.FillPatterns, fgColor: { argb: "E2EFDA" } },
//     };
//     // Add headers
//     const headerRow = sheet.getRow(1);
//     headerRow.getCell(1).value = "Merchant Name";
//     allDates.forEach((date, index) => {
//         headerRow.getCell(index + 2).value = date;
//     });
//     headerRow.getCell(allDates.length + 2).value = ""; // Empty Column
//     headerRow.getCell(allDates.length + 3).value = "Total"; // Total Column
//     headerRow.eachCell((cell) => (cell.style = headerStyle));
//     let rowIndex = 2;
//     // Fill data for each merchant
//     merchantData.forEach((merchant) => {
//         const { name, dailyData, dailyCommissions } = merchant;
//         // Merchant header
//         const merchantHeaderRow = sheet.getRow(rowIndex);
//         merchantHeaderRow.getCell(1).value = name;
//         merchantHeaderRow.getCell(1).style = subHeaderStyle;
//         rowIndex++;
//         // Process PayIn Collection and Commission (Easypaisa + JazzCash)
//         let totalPayInCollectionSum = 0;
//         let totalPayInCommissionSum = 0;
//         // Process PayIn Collection and Commission
//         const payInCollectionRow = sheet.getRow(rowIndex);
//         payInCollectionRow.getCell(1).value = `Total PayIn Collection`;
//         let payInCollectionOverallTotal = 0;
//         const payInCommissionRow = sheet.getRow(rowIndex + 1);
//         payInCommissionRow.getCell(1).value = `Total PayIn Commission`;
//         let payInCommissionOverallTotal = 0;
//         allDates.forEach((date, index) => {
//             const payInCollection =
//                 Math.abs((dailyData[date]?.Easypaisa || 0) + (dailyData[date]?.JazzCash || 0));
//             const payInCommission =
//                 Math.abs(
//                     (dailyCommissions[date]?.Easypaisa || 0) +
//                         (dailyCommissions[date]?.JazzCash || 0)
//                 );
//             payInCollectionRow.getCell(index + 2).value = payInCollection;
//             payInCommissionRow.getCell(index + 2).value = payInCommission;
//             totalPayInCollectionSum += payInCollection;
//             totalPayInCommissionSum += payInCommission;
//         });
//         payInCollectionRow.getCell(allDates.length + 2).value = totalPayInCollectionSum;
//         payInCommissionRow.getCell(allDates.length + 2).value = totalPayInCommissionSum;
//         payInCollectionRow.getCell(allDates.length + 3).value = `Total`;
//         payInCommissionRow.getCell(allDates.length + 3).value = `Total`;
//         payInCollectionRow.eachCell((cell) => (cell.style = dataRowStyle));
//         payInCommissionRow.eachCell((cell) => (cell.style = dataRowStyle));
//         rowIndex += 2;
//     });
//     // Save the file
//     const filePath = path.join(import.meta.dirname, "merchant_report.xlsx");
//     await workbook.commit();
//     return filePath;
// };
export const generateExcelReportService = async (params) => {
    console.time("Overall Execution Time");
    const startTime = Date.now(); // overall timer
    let customWhere = { date_time: {} };
    let disbursementDateWhere = {};
    const startDate = params?.start?.replace(" ", "+");
    const endDate = params?.end?.replace(" ", "+");
    if (startDate && endDate) {
        const todayStart = parseISO(startDate);
        const todayEnd = parseISO(endDate);
        customWhere["date_time"] = { gte: todayStart, lt: todayEnd };
        disbursementDateWhere = customWhere["date_time"];
    }
    console.log("Fetching merchants...");
    // ⏱️ Measure merchant fetch time
    console.time("Fetch Merchants");
    // Fetch all merchants (assuming merchants are not in huge volume)
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
                    disbursementWithHoldingTax: true
                }
            }
        }
    });
    console.timeEnd("Fetch Merchants");
    // Fetch paginated transactions
    const pageSize = 25000;
    // 
    // ⏱️ Count and paginate transactions
    console.time("Count & Paginate Transactions");
    const totalTransactionCount = await prisma.transaction.count();
    console.log("Total transactions in DB:", totalTransactionCount);
    const filteredTransactionCount = await prisma.transaction.count({
        where: { date_time: customWhere["date_time"], status: "completed" }
    });
    console.log("Filtered transactions count:", filteredTransactionCount);
    const totalPagesTransactions = Math.ceil(filteredTransactionCount / pageSize);
    console.timeEnd("Count & Paginate Transactions");
    const pagesTransactions = [...Array(totalPagesTransactions).keys()];
    // ⏱️ Fetch transactions in batches
    console.time("Fetch Transactions");
    const transactions = [];
    for (let i = 0; i < pagesTransactions.length; i += 9) {
        const batch = pagesTransactions.slice(i, i + 9).map((page, idx) => {
            console.log(`Fetching transaction page ${i + idx + 1}/${totalPagesTransactions}...`);
            return prisma.transaction.findMany({
                where: { date_time: customWhere["date_time"], status: "completed" },
                skip: page * pageSize,
                take: pageSize,
                select: {
                    merchant_id: true,
                    original_amount: true,
                    providerDetails: true,
                    date_time: true
                }
            });
        });
        const results = await Promise.allSettled(batch);
        results.forEach((result, idx) => {
            if (result.status === "fulfilled") {
                transactions.push(...result.value);
                console.log(`Fetched ${result.value.length} transactions on page ${i + idx}`);
            }
            else {
                console.error(`Error fetching transactions at page ${i + idx}:`, result.reason);
            }
        });
    }
    console.timeEnd("Fetch Transactions");
    // ⏱️ Count and paginate disbursements
    console.time("Count & Paginate Disbursements");
    // Fetch paginated disbursements
    const disbursementCount = await prisma.disbursement.count({
        where: { disbursementDate: disbursementDateWhere, status: "completed" }
    });
    const totalPagesDisbursements = Math.ceil(disbursementCount / pageSize);
    console.log(`Total disbursements: ${disbursementCount}, Pages: ${totalPagesDisbursements}`);
    const pagesDisbursements = [...Array(totalPagesDisbursements).keys()];
    console.timeEnd("Count & Paginate Disbursements");
    console.time("Fetch Disbursements");
    const disbursements = [];
    for (let i = 0; i < pagesDisbursements.length; i += 9) {
        const batch = pagesDisbursements.slice(i, i + 9).map((page, idx) => {
            console.log(`Fetching disbursement page ${i + idx + 1}/${totalPagesDisbursements}...`);
            return prisma.disbursement.findMany({
                where: { disbursementDate: disbursementDateWhere, status: "completed" },
                skip: page * pageSize,
                take: pageSize,
                select: {
                    merchant_id: true,
                    transactionAmount: true,
                    disbursementDate: true,
                    commission: true
                }
            });
        });
        const results = await Promise.allSettled(batch);
        results.forEach((result, idx) => {
            if (result.status === "fulfilled") {
                disbursements.push(...result.value);
                console.log(`Fetched ${result.value.length} disbursements on page ${i + idx}`);
            }
            else {
                console.error(`Error fetching disbursements at page ${i + idx}:`, result.reason);
            }
        });
    }
    console.timeEnd("Fetch Disbursements");
    // Group transactions and disbursements by merchant_id upfront
    const transactionsByMerchant = new Map();
    transactions.forEach(txn => {
        if (!transactionsByMerchant.has(txn.merchant_id)) {
            transactionsByMerchant.set(txn.merchant_id, []);
        }
        transactionsByMerchant.get(txn.merchant_id).push(txn);
    });
    const disbursementsByMerchant = new Map();
    disbursements.forEach(d => {
        if (!disbursementsByMerchant.has(d.merchant_id)) {
            disbursementsByMerchant.set(d.merchant_id, []);
        }
        disbursementsByMerchant.get(d.merchant_id).push(d);
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
    // Process merchant data asynchronously
    console.log("Processing merchant data...");
    // ⏱️ Process merchants
    console.time("Process Merchants");
    const merchantData = await Promise.all(merchants.map(async (merchant, index) => {
        console.log(`Processing merchant ${index + 1}/${merchants.length}: ${merchant.full_name}`);
        const merchantTransactions = transactionsByMerchant.get(merchant.merchant_id) || [];
        const merchantDisbursements = disbursementsByMerchant.get(merchant.merchant_id) || [];
        const firstCommission = merchant.commissions?.[0];
        const commissionMode = firstCommission?.commissionMode ?? "SINGLE"; // fallback to SINGLE
        const commissionRate = Number(firstCommission?.commissionRate ?? 0);
        const easypaisaRate = Number(firstCommission?.easypaisaRate ?? 0);
        const commissionGST = Number(firstCommission?.commissionGST ?? 0);
        const commissionWithHoldingTax = Number(firstCommission?.commissionWithHoldingTax ?? 0);
        const commissionBaseRate = Number(commissionRate ?? 0);
        const easypaisaBaseRate = Number(easypaisaRate ?? 0);
        const gst = Number(commissionGST ?? 0);
        const wht = Number(commissionWithHoldingTax ?? 0);
        const dailyData = {};
        merchantTransactions.forEach((txn) => {
            const pktDate = format(toZonedTime(txn.date_time, TIMEZONE), "yyyy-MM-dd");
            if (!dailyData[pktDate]) {
                dailyData[pktDate] = {
                    Easypaisa: 0,
                    JazzCash: 0,
                    Disbursement: 0,
                    DisbursementCommission: 0,
                    EasypaisaCommission: 0,
                    JazzCashCommission: 0,
                };
            }
            const providerName = txn.providerDetails?.name;
            const amount = Number(txn.original_amount ?? 0);
            if (providerName?.includes("Easypaisa")) {
                dailyData[pktDate].Easypaisa += amount;
                const rate = commissionMode === "SINGLE"
                    ? commissionBaseRate + gst + wht
                    : easypaisaBaseRate + gst + wht;
                dailyData[pktDate].EasypaisaCommission += amount * rate;
            }
            else if (providerName?.includes("JazzCash")) {
                dailyData[pktDate].JazzCash += amount;
                const rate = commissionBaseRate + gst + wht;
                dailyData[pktDate].JazzCashCommission += amount * rate;
            }
        });
        merchantDisbursements.forEach((d) => {
            const pktDate = format(toZonedTime(d.disbursementDate, TIMEZONE), "yyyy-MM-dd");
            if (!dailyData[pktDate]) {
                dailyData[pktDate] = {
                    Easypaisa: 0,
                    JazzCash: 0,
                    Disbursement: 0,
                    DisbursementCommission: 0,
                };
            }
            dailyData[pktDate].Disbursement += Number(d.transactionAmount);
            dailyData[pktDate].DisbursementCommission += Number(d.commission);
        });
        const dailyCommissions = Object.fromEntries(Object.entries(dailyData).map(([date, d]) => [
            date,
            {
                Easypaisa: d.EasypaisaCommission ?? 0,
                JazzCash: d.JazzCashCommission ?? 0,
                Disbursement: d.DisbursementCommission,
            },
        ]));
        return {
            name: merchant.full_name,
            dailyData,
            dailyCommissions,
        };
    }));
    console.timeEnd("Process Merchants");
    // Generate Excel report
    console.log("Generating Excel Report...");
    console.timeEnd("Overall Execution Time");
    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
        filename: path.join(process.cwd(), "src/services/reports", `merchant_report_${Date.now()}.xlsx`)
    });
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
    const headerRow = sheet.getRow(1);
    headerRow.getCell(1).value = "Merchant Name";
    allDates.forEach((date, index) => {
        headerRow.getCell(index + 2).value = date;
    });
    headerRow.getCell(allDates.length + 2).value = ""; // Empty Column
    headerRow.getCell(allDates.length + 3).value = "Total"; // Total Column
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
        // Process PayIn Collection and Commission (Easypaisa + JazzCash)
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
            const payInCommission = Math.abs((dailyCommissions[date]?.Easypaisa || 0) +
                (dailyCommissions[date]?.JazzCash || 0));
            payInCollectionRow.getCell(index + 2).value = payInCollection;
            payInCommissionRow.getCell(index + 2).value = payInCommission;
            totalPayInCollectionSum += payInCollection;
            totalPayInCommissionSum += payInCommission;
        });
        payInCollectionRow.getCell(allDates.length + 2).value = totalPayInCollectionSum;
        payInCommissionRow.getCell(allDates.length + 2).value = totalPayInCommissionSum;
        payInCollectionRow.getCell(allDates.length + 3).value = `Total`;
        payInCommissionRow.getCell(allDates.length + 3).value = `Total`;
        payInCollectionRow.eachCell((cell) => (cell.style = dataRowStyle));
        payInCommissionRow.eachCell((cell) => (cell.style = dataRowStyle));
        rowIndex += 2;
    });
    // Save the file
    const filePath = path.join(import.meta.dirname, "merchant_report.xlsx");
    await workbook.commit();
    console.log("Excel report generation completed and file saved.");
    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`✅ generateExcelReportService completed in ${totalTime}s`);
    return filePath;
};
export const payoutPerWalletService = async (params) => {
    try {
        const { startDate, endDate } = params;
        let start_date, end_date;
        if (startDate && endDate) {
            start_date = new Date(format(toZonedTime(startDate, "Asia/Karachi"), 'yyyy-MM-dd HH:mm:ss', { timeZone: "Asia/Karachi" }));
            end_date = new Date(format(toZonedTime(endDate, "Asia/Karachi"), 'yyyy-MM-dd HH:mm:ss', { timeZone: "Asia/Karachi" }));
        }
        // 🧠 Let DB do the aggregation
        const [jazzCashAgg, easypaisaAgg] = await Promise.all([
            prisma.disbursement.findMany({
                where: {
                    status: 'completed',
                    disbursementDate: {
                        gte: start_date,
                        lt: end_date,
                    },
                    OR: [
                        {
                            provider: PROVIDERS.JAZZ_CASH
                        },
                        {
                            providerDetails: {
                                path: ["sub_name"],
                                equals: PROVIDERS.JAZZ_CASH
                            }
                        }
                    ]
                },
                select: {
                    providerDetails: true,
                    merchantAmount: true,
                },
            }),
            prisma.disbursement.findMany({
                where: {
                    status: 'completed',
                    disbursementDate: {
                        gte: start_date,
                        lt: end_date,
                    },
                    OR: [
                        {
                            provider: PROVIDERS.EASYPAISA
                        },
                        {
                            providerDetails: {
                                path: ["sub_name"],
                                equals: PROVIDERS.EASYPAISA
                            }
                        }
                    ]
                },
                select: {
                    providerDetails: true,
                    merchantAmount: true,
                },
            })
        ]);
        const jazzCashAggregation = jazzCashAgg.reduce((acc, t) => {
            const merchantId = Number(t.providerDetails?.id);
            if (Number.isNaN(merchantId))
                return acc;
            acc[merchantId] = acc[merchantId] || { total_amount: 0, provider_name: 'JazzCash' };
            acc[merchantId].total_amount += Number(t.merchantAmount);
            return acc;
        }, {});
        const easypaisaAggregation = easypaisaAgg.reduce((acc, t) => {
            const merchantId = 3;
            if (Number.isNaN(merchantId))
                return acc;
            acc[merchantId] = acc[merchantId] || { total_amount: 0, provider_name: 'Easypaisa' };
            acc[merchantId].total_amount += Number(t.merchantAmount);
            return acc;
        }, {});
        // 🧾 Prepare merchant ID arrays
        const jazzCashIds = Object.keys(jazzCashAggregation).map(Number);
        const easypaisaIds = Object.keys(easypaisaAggregation).map(Number);
        // 🧵 Fetch all merchants in parallel
        const [jazzCashMerchants, easypaisaMerchants] = await Promise.all([
            prisma.jazzCashDisburseAccount.findMany({ where: { id: { in: jazzCashIds } }, select: { id: true, merchant_of: true } }),
            prisma.easyPaisaDisburseAccount.findMany({ where: { id: { in: easypaisaIds } }, select: { id: true, merchant_of: true } }),
        ]);
        // 🧱 Format results
        const jazzCashResult = jazzCashMerchants.map((m) => ({
            returnUrl: m.merchant_of,
            total_amount: jazzCashAggregation[m.id]?.total_amount || 0,
            provider_name: 'JazzCash',
        }));
        const easyPaisaResult = easypaisaMerchants.map((m) => ({
            returnUrl: m.merchant_of,
            total_amount: easypaisaAggregation[m.id]?.total_amount || 0,
            provider_name: 'Easypaisa',
        }));
        return {
            jazzCashTransactions: jazzCashResult,
            easypaisaTransactions: easyPaisaResult
        };
    }
    catch (error) {
        console.error(error);
        throw new CustomError("Internal Server Error", 400);
    }
};
export const payinPerWalletService = async (params) => {
    try {
        const t0 = Date.now();
        const { startDate, endDate } = params;
        let start_date, end_date;
        if (startDate && endDate) {
            start_date = new Date(format(toZonedTime(startDate, "Asia/Karachi"), 'yyyy-MM-dd HH:mm:ss', { timeZone: "Asia/Karachi" }));
            end_date = new Date(format(toZonedTime(endDate, "Asia/Karachi"), 'yyyy-MM-dd HH:mm:ss', { timeZone: "Asia/Karachi" }));
        }
        const log = (payload) => {
            try {
                console.log(JSON.stringify({ event: 'PAYIN_PER_WALLET', ...payload }));
            }
            catch { /* noop */ }
        };
        log({ phase: 'params', startDate, endDate, start_date, end_date });
        // Build date filter only when provided (avoids undefined filters)
        const dateFilter = start_date && end_date ? { date_time: { gte: start_date, lt: end_date } } : {};
        // Fetch completed transactions by provider
        const [jazzCashAgg, easypaisaAgg] = await Promise.all([
            prisma.transaction.findMany({
                where: {
                    status: 'completed',
                    ...dateFilter,
                    providerDetails: { path: ['name'], equals: 'JazzCash' },
                },
                select: { providerDetails: true, original_amount: true },
            }),
            prisma.transaction.findMany({
                where: {
                    status: 'completed',
                    ...dateFilter,
                    providerDetails: { path: ['name'], equals: 'Easypaisa' },
                },
                select: { providerDetails: true, original_amount: true },
            }),
        ]);
        log({ phase: 'fetch', jazzCashCount: jazzCashAgg.length, easypaisaCount: easypaisaAgg.length });
        // JazzCash aggregation (unchanged)
        const jazzCashAggregation = jazzCashAgg.reduce((acc, t) => {
            const merchantId = Number(t.providerDetails?.id);
            if (Number.isNaN(merchantId))
                return acc;
            const row = acc[merchantId] || { total_amount: 0, provider_name: 'JazzCash' };
            row.total_amount += Number(t.original_amount);
            acc[merchantId] = row;
            return acc;
        }, {});
        log({ phase: 'jazzcash_agg', keys: Object.keys(jazzCashAggregation).length });
        const classifyEP = (providerId, subName) => {
            const sn = (subName || '').toLowerCase();
            if ([2, 3].includes(providerId) || sn.includes('swich'))
                return 'SWICH';
            if (providerId === 5 || sn.includes('payfast'))
                return 'PAYFAST';
            return 'DIRECT';
        };
        const addAmountNum = (map, key, amt) => {
            map[key] = (map[key] || 0) + amt;
        };
        const addAmountStr = (map, key, amt) => {
            if (!key)
                return;
            map[key] = (map[key] || 0) + amt;
        };
        // Aggregate Easypaisa by provider id and by merchant name (providerDetails.merchant)
        const idAgg = { DIRECT: {}, SWICH: {}, PAYFAST: {} };
        const nameAgg = { DIRECT: {}, SWICH: {}, PAYFAST: {} };
        for (const t of easypaisaAgg) {
            const provider = t.providerDetails;
            const providerId = Number(provider?.id);
            const subName = String(provider?.sub_name || '');
            const merchantName = String(provider?.merchant || '').trim();
            const bucket = classifyEP(providerId, subName);
            const amount = Number(t.original_amount);
            // Priority: use merchant full name when available; fallback to provider id
            if (merchantName)
                addAmountStr(nameAgg[bucket], merchantName, amount);
            else if (!Number.isNaN(providerId))
                addAmountNum(idAgg[bucket], providerId, amount);
        }
        log({ phase: 'easypaisa_agg', idCounts: { DIRECT: Object.keys(idAgg.DIRECT).length, SWICH: Object.keys(idAgg.SWICH).length, PAYFAST: Object.keys(idAgg.PAYFAST).length }, nameCounts: { DIRECT: Object.keys(nameAgg.DIRECT).length, SWICH: Object.keys(nameAgg.SWICH).length, PAYFAST: Object.keys(nameAgg.PAYFAST).length } });
        // Collect ids and names for lookups
        const jcIds = Object.keys(jazzCashAggregation).map(Number);
        const epIds = Object.keys(idAgg.DIRECT).map(Number);
        const swIds = Object.keys(idAgg.SWICH).map(Number);
        const pfIds = Object.keys(idAgg.PAYFAST).map(Number);
        const nameSet = new Set([
            ...Object.keys(nameAgg.DIRECT),
            ...Object.keys(nameAgg.SWICH),
            ...Object.keys(nameAgg.PAYFAST),
        ]);
        const epNames = Array.from(nameSet);
        // Fetch provider tables and merchant mappings
        const [jazzCashMerchants, easyPaisaMerchants, swichMerchants, payfastMerchants, jcIdMapRows, epIdMapRows, swIdMapRows, pfIdMapRows, nameMapRows,] = await Promise.all([
            prisma.jazzCashMerchant.findMany({ where: { id: { in: jcIds } }, select: { id: true, returnUrl: true } }),
            prisma.easyPaisaMerchant.findMany({ where: { id: { in: epIds } }, select: { id: true, username: true } }),
            prisma.swichMerchant.findMany({ where: { id: { in: swIds } }, select: { id: true } }),
            prisma.payFastMerchant.findMany({ where: { id: { in: pfIds } }, select: { id: true, name: true } }),
            prisma.merchant.findMany({ where: { jazzCashMerchantId: { in: jcIds.length ? jcIds : [-1] } }, select: { merchant_id: true, full_name: true, company_name: true, jazzCashMerchantId: true } }),
            prisma.merchant.findMany({ where: { easyPaisaMerchantId: { in: epIds.length ? epIds : [-1] } }, select: { merchant_id: true, full_name: true, company_name: true, easyPaisaMerchantId: true } }),
            prisma.merchant.findMany({ where: { swichMerchantId: { in: swIds.length ? swIds : [-1] } }, select: { merchant_id: true, full_name: true, company_name: true, swichMerchantId: true } }),
            prisma.merchant.findMany({ where: { payFastMerchantId: { in: pfIds.length ? pfIds : [-1] } }, select: { merchant_id: true, full_name: true, company_name: true, payFastMerchantId: true } }),
            prisma.merchant.findMany({ where: { full_name: { in: epNames.length ? epNames : ['__none__'] } }, select: { merchant_id: true, full_name: true, company_name: true, easyPaisaMerchantId: true } }),
        ]);
        log({ phase: 'lookups_fetched', counts: { jc: jazzCashMerchants.length, ep: easyPaisaMerchants.length, sw: swichMerchants.length, pf: payfastMerchants.length, jcMap: jcIdMapRows.length, epMap: epIdMapRows.length, swMap: swIdMapRows.length, pfMap: pfIdMapRows.length, nameMap: nameMapRows.length } });
        // Build lookup maps (provider id -> Merchant) and (name -> Merchant)
        const jcIdToMerchant = new Map();
        const epIdToMerchant = new Map();
        const swIdToMerchant = new Map();
        const pfIdToMerchant = new Map();
        const nameToMerchant = new Map();
        for (const r of jcIdMapRows)
            jcIdToMerchant.set(r.jazzCashMerchantId, { merchant_id: r.merchant_id, name: r.company_name || r.full_name || null });
        for (const r of epIdMapRows)
            epIdToMerchant.set(r.easyPaisaMerchantId, { merchant_id: r.merchant_id, name: r.company_name || r.full_name || null });
        for (const r of swIdMapRows)
            swIdToMerchant.set(r.swichMerchantId, { merchant_id: r.merchant_id, name: r.company_name || r.full_name || null });
        for (const r of pfIdMapRows)
            pfIdToMerchant.set(r.payFastMerchantId, { merchant_id: r.merchant_id, name: r.company_name || r.full_name || null });
        for (const r of nameMapRows)
            nameToMerchant.set(r.full_name, { merchant_id: r.merchant_id, name: r.company_name || r.full_name || null, ep_id: r.easyPaisaMerchantId ?? null });
        // Provider arrays (JazzCash unchanged; EP/Swich/Payfast enriched with merchant mapping when available)
        const mapNotNull = (arr) => arr.filter((x) => x !== null);
        const jazzCashTransactions = jazzCashMerchants.map((m) => {
            const mapped = jcIdToMerchant.get(m.id);
            return {
                returnUrl: m.returnUrl,
                total_amount: jazzCashAggregation[m.id]?.total_amount || 0,
                provider_name: 'JazzCash',
                merchant_id: mapped?.merchant_id ?? null,
                merchant_name: mapped?.name ?? null,
            };
        });
        const easyPaisaTransactions = easyPaisaMerchants.map((m) => {
            const mapped = epIdToMerchant.get(m.id);
            return {
                username: m.username,
                total_amount: (idAgg.DIRECT[m.id] || 0),
                provider_name: 'Easypaisa',
                merchant_id: mapped?.merchant_id ?? null,
                merchant_name: mapped?.name ?? null,
            };
        });
        const swichTransactions = swichMerchants.map((m) => {
            const mapped = swIdToMerchant.get(m.id);
            return {
                id: m.id,
                total_amount: (idAgg.SWICH[m.id] || 0),
                provider_name: 'Swich',
                merchant_id: mapped?.merchant_id ?? null,
                merchant_name: mapped?.name ?? null,
            };
        });
        const payfastTransactions = payfastMerchants.map((m) => {
            const mapped = pfIdToMerchant.get(m.id);
            return {
                name: m.name,
                total_amount: (idAgg.PAYFAST[m.id] || 0),
                provider_name: 'PayFast',
                merchant_id: mapped?.merchant_id ?? null,
                merchant_name: mapped?.name ?? null,
            };
        });
        log({ phase: 'arrays_built', counts: { jc: jazzCashTransactions.length, ep: easyPaisaTransactions.length, sw: swichTransactions.length, pf: payfastTransactions.length } });
        // Unified Easypaisa DIRECT accounts aggregated by account username (from providerDetails.sub_merchant)
        // merchant_name is taken directly from providerDetails.merchant; merchant_id is ignored (null)
        const unifiedAccounts = new Map();
        for (const t of easypaisaAgg) {
            const provider = t.providerDetails;
            const providerId = Number(provider?.id);
            const subName = String(provider?.sub_name || '');
            const bucket = classifyEP(providerId, subName);
            if (bucket !== 'DIRECT')
                continue; // only direct accounts
            const username = String(provider?.sub_merchant || '').trim();
            if (!username)
                continue;
            const merchantName = String(provider?.merchant || '').trim() || null;
            const amt = Number(t.original_amount);
            const prev = unifiedAccounts.get(username) || { username, merchant_name: null, total_amount: 0 };
            prev.total_amount += amt;
            if (!prev.merchant_name && merchantName)
                prev.merchant_name = merchantName;
            unifiedAccounts.set(username, prev);
        }
        const easyPaisaUnifiedTransactions = Array.from(unifiedAccounts.values()).map((v) => ({
            username: v.username,
            total_amount: v.total_amount,
            provider_name: 'Easypaisa',
            merchant_id: null,
            merchant_name: v.merchant_name,
        }));
        // Merge collections between easyPaisaTransactions and easyPaisaUnifiedTransactions based on username
        const etMap = new Map();
        for (const e of easyPaisaTransactions) {
            if (e?.username)
                etMap.set(e.username, e);
        }
        const euMap = new Map();
        for (const u of easyPaisaUnifiedTransactions) {
            if (u?.username)
                euMap.set(u.username, u);
        }
        const allUsernames = new Set([...etMap.keys(), ...euMap.keys()]);
        const easyPaisaTransactionsMerged = [];
        const easyPaisaUnifiedTransactionsMerged = [];
        for (const uname of allUsernames) {
            const et = etMap.get(uname);
            const eu = euMap.get(uname);
            const total = (et?.total_amount || 0) + (eu?.total_amount || 0);
            // Update or append to easyPaisaTransactions
            if (et) {
                easyPaisaTransactionsMerged.push({ ...et, total_amount: total });
            }
            else {
                easyPaisaTransactionsMerged.push({
                    username: uname,
                    total_amount: total,
                    provider_name: 'Easypaisa',
                    merchant_id: null,
                    merchant_name: eu?.merchant_name ?? null,
                });
            }
            // Update or append to easyPaisaUnifiedTransactions
            if (eu) {
                easyPaisaUnifiedTransactionsMerged.push({ ...eu, total_amount: total });
            }
            else {
                easyPaisaUnifiedTransactionsMerged.push({
                    username: uname,
                    total_amount: total,
                    provider_name: 'Easypaisa',
                    merchant_id: null,
                    merchant_name: et?.merchant_name ?? null,
                });
            }
        }
        const elapsed = Date.now() - t0;
        log({ phase: 'done', elapsed_ms: elapsed, merged_usernames: easyPaisaUnifiedTransactionsMerged.length });
        return {
            jazzCashTransactions,
            easyPaisaTransactions: easyPaisaUnifiedTransactionsMerged,
            swichTransactions,
            payfastTransactions,
        };
    }
    catch (error) {
        console.error(JSON.stringify({ event: 'PAYIN_PER_WALLET', phase: 'error', message: error?.message }));
        throw new CustomError("Internal Server Error", 400);
    }
};
export default {
    generateExcelReportService,
    payinPerWalletService,
    payoutPerWalletService
};
