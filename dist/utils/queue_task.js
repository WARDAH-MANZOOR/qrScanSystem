import { Prisma } from "@prisma/client";
import { toZonedTime } from "date-fns-tz";
import prisma from "../prisma/client.js";
const task = async () => {
    console.log("Cron running");
    try {
        await prisma.$transaction(async (tx) => {
            // 1. Fetch all pending scheduled tasks that are due
            const tasks = await fetchPendingScheduledTasks(tx);
            // 2. Group transactions by merchant_id
            const { transactionsByMerchant, transactionIdToTaskIdMap, } = groupTransactionsByMerchant(tasks);
            // 3. Fetch financial terms for all merchants involved
            const merchantFinancialTermsMap = await fetchMerchantFinancialTerms(tx, Array.from(transactionsByMerchant.keys()));
            // 4. Process settlements per merchant
            for (const [merchant_id, transactions] of transactionsByMerchant.entries()) {
                await processMerchantSettlement(tx, merchant_id, transactions, merchantFinancialTermsMap.get(merchant_id), transactionIdToTaskIdMap);
            }
        }, {
            timeout: 3600000,
            maxWait: 3600000
        });
    }
    catch (error) {
        console.error("Error during settlement process:", error);
        // Handle error appropriately, possibly re-throw or log
    }
};
// Function to fetch pending scheduled tasks that are due
async function fetchPendingScheduledTasks(prisma) {
    return await prisma.scheduledTask.findMany({
        where: {
            status: 'pending',
            scheduledAt: {
                lte: new Date(),
            },
        },
        include: {
            transaction: {
                include: {
                    merchant: true,
                },
            },
        },
    });
}
// Function to group transactions by merchant_id
function groupTransactionsByMerchant(tasks) {
    const transactionsByMerchant = new Map();
    const transactionIdToTaskIdMap = new Map();
    for (const task of tasks) {
        const transaction = task.transaction;
        if (!transaction || transaction.original_amount === undefined) {
            continue; // Skip if transaction is invalid
        }
        // Map transaction IDs to task IDs
        transactionIdToTaskIdMap.set(transaction.transaction_id, task.id);
        const merchant_id = transaction.merchant_id;
        if (!transactionsByMerchant.has(merchant_id)) {
            transactionsByMerchant.set(merchant_id, []);
        }
        transactionsByMerchant.get(merchant_id)?.push(transaction);
    }
    return { transactionsByMerchant, transactionIdToTaskIdMap };
}
// Function to fetch merchant financial terms
async function fetchMerchantFinancialTerms(prisma, merchantIds) {
    const merchantFinancialTermsList = await prisma.merchantFinancialTerms.findMany({
        where: {
            merchant_id: { in: merchantIds },
        },
    });
    // Map merchant IDs to their financial terms
    const merchantFinancialTermsMap = new Map();
    for (const terms of merchantFinancialTermsList) {
        if (!merchantFinancialTermsMap.has(terms.merchant_id)) {
            merchantFinancialTermsMap.set(terms.merchant_id, terms);
        }
    }
    return merchantFinancialTermsMap;
}
// Function to process settlement for a single merchant
async function processMerchantSettlement(tx, merchant_id, transactions, merchantFinancialTerms, transactionIdToTaskIdMap) {
    if (!merchantFinancialTerms) {
        console.error(`No financial terms found for merchant ${merchant_id}`);
        return; // Skip this merchant
    }
    // Aggregate data
    const settlementData = calculateSettlementData(transactions, merchantFinancialTerms);
    const today = new Date();
    // Define the Pakistan timezone
    const timeZone = 'Asia/Karachi';
    // Convert the date to the Pakistan timezone
    const zonedDate = toZonedTime(today, timeZone);
    const settlementDate = new Date(zonedDate.getFullYear(), zonedDate.getMonth(), zonedDate.getDate());
    // Upsert SettlementReport for the day
    await tx.settlementReport.upsert({
        where: {
            merchant_id_settlementDate: {
                merchant_id,
                settlementDate,
            },
        },
        create: {
            merchant_id,
            settlementDate,
            transactionCount: settlementData.transactionCount,
            transactionAmount: settlementData.transactionAmount,
            commission: settlementData.totalCommission,
            gst: settlementData.totalGST,
            withholdingTax: settlementData.totalWithholdingTax,
            merchantAmount: settlementData.merchantAmount,
        },
        update: {
            transactionCount: { increment: settlementData.transactionCount },
            transactionAmount: { increment: settlementData.transactionAmount },
            commission: { increment: settlementData.totalCommission },
            gst: { increment: settlementData.totalGST },
            withholdingTax: { increment: settlementData.totalWithholdingTax },
            merchantAmount: { increment: settlementData.merchantAmount },
        },
    });
    // Update transactions and tasks
    await updateTransactionsAndTasks(tx, transactions, transactionIdToTaskIdMap);
}
// Function to calculate settlement data
function calculateSettlementData(transactions, merchantFinancialTerms) {
    const transactionCount = transactions.length;
    const transactionAmount = transactions.reduce((sum, t) => sum.plus(t.original_amount || new Prisma.Decimal(0)), new Prisma.Decimal(0));
    // Extract financial terms
    const { commissionRate, commissionWithHoldingTax, commissionGST, } = merchantFinancialTerms;
    // Calculate commission and taxes
    const totalCommission = transactionAmount.mul(commissionRate);
    const totalGST = transactionAmount.mul(commissionGST);
    const totalWithholdingTax = transactionAmount.mul(commissionWithHoldingTax);
    // Calculate merchant amount
    const merchantAmount = transactionAmount
        .minus(totalCommission)
        .minus(totalGST)
        .minus(totalWithholdingTax);
    return {
        transactionCount,
        transactionAmount,
        totalCommission,
        totalGST,
        totalWithholdingTax,
        merchantAmount,
    };
}
// Function to update transactions and scheduled tasks
async function updateTransactionsAndTasks(prisma, transactions, transactionIdToTaskIdMap) {
    // Update transactions as settled
    const transactionIds = transactions.map((t) => t.transaction_id);
    await prisma.transaction.updateMany({
        where: { transaction_id: { in: transactionIds } },
        data: { settlement: true },
    });
    // Update scheduled tasks as completed
    const taskIds = transactionIds
        .map((tid) => transactionIdToTaskIdMap.get(tid))
        .filter((id) => id !== undefined);
    const today = new Date();
    // Define the Pakistan timezone
    const timeZone = 'Asia/Karachi';
    // Convert the date to the Pakistan timezone
    const zonedDate = toZonedTime(today, timeZone);
    await prisma.scheduledTask.updateMany({
        where: { id: { in: taskIds }, status: 'pending' },
        data: { status: 'completed', executedAt: zonedDate },
    });
}
export default task;
