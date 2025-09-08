import { MerchantFinancialTerms, Prisma, PrismaClient, Transaction } from "@prisma/client";
import { Decimal, DefaultArgs, JsonObject } from "@prisma/client/runtime/library";
import { toZonedTime } from "date-fns-tz";
import prisma from "../prisma/client.js";
import { text } from "express";
import { backofficeService } from "../services/index.js";
import { calculateWalletBalanceWithTx, getWalletBalance } from "../services/paymentGateway/disbursement.js";
// zonedTimeToUtc کو import نہ کریں کیونکہ یہ date-fns-tz میں موجود نہیں ہے

const task = async () => {
  console.log("Cron running");
  // console.log(deductionSourceTxns.at(0))
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Fetch all pending scheduled tasks that are due
      const tasks = await fetchPendingScheduledTasks(tx);

      // 2. Group transactions by merchant_id
      // groupTransactionsByMerchant سے واپس آنے والی ویلیو undefined ہو سکتی ہے، اس لیے اسے handle کریں
      const grouped = groupTransactionsByMerchant(tasks);
      const transactionsByMerchant = grouped?.transactionsByMerchant ?? new Map();
      const transactionIdToTaskIdMap = grouped?.transactionIdToTaskIdMap ?? new Map();

      // 3. Fetch financial terms for all merchants involved
      const merchantFinancialTermsMap = await fetchMerchantFinancialTerms(
        tx,
        Array.from(transactionsByMerchant.keys())
      );

      // 4. Process settlements per merchant
      for (const [merchant_id, transactions] of transactionsByMerchant.entries()) {
        await processMerchantSettlement(
          tx,
          merchant_id,
          transactions,
          merchantFinancialTermsMap?.get(merchant_id),
          transactionIdToTaskIdMap
        );
      }
    }, {
      timeout: 3600000,
      maxWait: 3600000
    });
  } catch (error) {
    console.error("Error during settlement process:", error);
    // Handle error appropriately, possibly re-throw or log
  }
};

// Function to fetch pending scheduled tasks that are due
// async function fetchPendingScheduledTasks(prisma: Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) {
//   return await prisma.scheduledTask.findMany({
//     where: {
//       status: 'pending',
//       scheduledAt: {
//         lte: new Date(),
//       },
//     },
//     include: {
//       transaction: {
//         include: {
//           merchant: true,
//         },
//       },
//     },
//   });
// }

async function fetchPendingScheduledTasks(prisma: Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) {
  try {
    const CHUNK_SIZE = 10000; // Customize this chunk size based on memory
    let hasMore = true;
    let lastId: number | undefined = undefined;
    const allTasks = [];

    while (hasMore) {
      const chunk: Array<any> = await prisma.scheduledTask.findMany({
        where: {
          status: 'pending',
          scheduledAt: {
            lte: new Date(),
          },
          ...(lastId && {
            id: { gt: lastId }, // Cursor pagination using primary key
          }),
          // transaction: {
          //   merchant_id: 5
          // }
        },
        orderBy: { id: 'asc' }, // Important for cursor pagination
        include: {
          transaction: true,
        },
        take: CHUNK_SIZE,
      });
      console.log(chunk)
      allTasks.push(...chunk);

      if (chunk.length < CHUNK_SIZE) {
        hasMore = false;
      } else {
        lastId = chunk[chunk.length - 1].id;
      }
    }

    return allTasks; 
  } catch (error) {
    console.error("Error fetching scheduled tasks for merchant:", error);
    throw error;
  }
}

// Function to group transactions by merchant_id
function groupTransactionsByMerchant(tasks: any[]) {
  try {
    const transactionsByMerchant = new Map<number, Transaction[]>();
    const transactionIdToTaskIdMap = new Map<string, number>();

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
  catch (err) {
    console.log(err)
  }
}

// Function to fetch merchant financial terms
async function fetchMerchantFinancialTerms(
  prisma: Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
  merchantIds: number[]
) {
  try {
    const merchantFinancialTermsList = await prisma.merchantFinancialTerms.findMany({
      where: {
        merchant_id: { in: merchantIds },
      },
    });

    // Map merchant IDs to their financial terms
    const merchantFinancialTermsMap = new Map<number, MerchantFinancialTerms>();

    for (const terms of merchantFinancialTermsList) {
      if (!merchantFinancialTermsMap.has(terms.merchant_id)) {
        merchantFinancialTermsMap.set(terms.merchant_id, terms);
      }
    }

    return merchantFinancialTermsMap;
  } catch (err) {
    console.log(err)
  }
}

// // Function to process settlement for a single merchant
// async function processMerchantSettlement(
//   tx: Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
//   merchant_id: number,
//   transactions: Transaction[],
//   merchantFinancialTerms: MerchantFinancialTerms | undefined,
//   transactionIdToTaskIdMap: Map<string, number>
// ) {
//   if (!merchantFinancialTerms) {
//     console.error(`No financial terms found for merchant ${merchant_id}`);
//     return; // Skip this merchant
//   }

//   // Aggregate data
//   const settlementData = calculateSettlementData(transactions, merchantFinancialTerms);

//   const today = new Date();

//   // Define the Pakistan timezone
//   const timeZone = 'Asia/Karachi';

//   // Convert the date to the Pakistan timezone
//   const zonedDate = toZonedTime(today, timeZone);
//   const settlementDate = new Date(zonedDate.getFullYear(), zonedDate.getMonth(), zonedDate.getDate());

//   // Upsert SettlementReport for the day
//   await tx.settlementReport.upsert({
//     where: {
//       merchant_id_settlementDate: {
//         merchant_id,
//         settlementDate,
//       },
//     },
//     create: {
//       merchant_id,
//       settlementDate,
//       transactionCount: settlementData.transactionCount,
//       transactionAmount: settlementData.transactionAmount,
//       commission: settlementData.totalCommission,
//       gst: settlementData.totalGST,
//       withholdingTax: settlementData.totalWithholdingTax,
//       merchantAmount: settlementData.merchantAmount,
//     },
//     update: {
//       transactionCount: { increment: settlementData.transactionCount },
//       transactionAmount: { increment: settlementData.transactionAmount },
//       commission: { increment: settlementData.totalCommission },
//       gst: { increment: settlementData.totalGST },
//       withholdingTax: { increment: settlementData.totalWithholdingTax },
//       merchantAmount: { increment: settlementData.merchantAmount },
//     },
//   });

//   // Update transactions and tasks
//   await updateTransactionsAndTasks(
//     tx,
//     transactions,
//     transactionIdToTaskIdMap
//   );
// }

// Function to process settlement for a single merchant
const dateFilter = async () => {
  // Define PKT timezone
  const PKT = "Asia/Karachi";

  // Get current date in PKT
  const nowInPKT = toZonedTime(new Date(), PKT);

  // Start of today in PKT
  const startOfTodayInPKT = new Date(
    nowInPKT.getFullYear(),
    nowInPKT.getMonth(),
    nowInPKT.getDate(),
  );

  // آج کے دن کے آغاز کو دوبارہ UTC میں تبدیل کریں
  // آج کے دن کے آغاز کو دوبارہ UTC میں تبدیل کریں
  // Convert start of today back to UTC
  // NOTE: zonedTimeToUtc کو 'date-fns-tz' سے امپورٹ کرنا ضروری ہے
  // NOTE: You must import zonedTimeToUtc from 'date-fns-tz' at the top of your file
  // Example: import { zonedTimeToUtc } from 'date-fns-tz';
  const startOfTodayUTC = toZonedTime(startOfTodayInPKT, PKT);

  // اگر آپ نے اوپر امپورٹ کر لیا ہے تو یہ لائن استعمال کریں:
  // If you have imported at the top, use this line instead:
  // const startOfTodayUTC = zonedTimeToUtc(startOfTodayInPKT, PKT);
  return startOfTodayUTC;
}
async function processMerchantSettlement(
  tx: Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
  merchant_id: number,
  transactions: Transaction[],
  merchantFinancialTerms: MerchantFinancialTerms | undefined,
  transactionIdToTaskIdMap: Map<string, number>
) {
  try {
    if (!merchantFinancialTerms) {
      console.error(`No financial terms found for merchant ${merchant_id}`);
      return; // Skip this merchant
    }

    // Define the Pakistan timezone
    const timeZone = 'Asia/Karachi';
    const today = new Date();
    const zonedDate = toZonedTime(today, timeZone);
    const settlementDate = new Date(zonedDate.getFullYear(), zonedDate.getMonth(), zonedDate.getDate());

    // Aggregate data
    const settlementData = calculateSettlementData(transactions, merchantFinancialTerms);

    // Deduction handling similar to settleAllMerchantTransactions
    let totalProviderDeduction = new Decimal(0);
    const startOfTodayUTC = await dateFilter()
    let originalDeductionSourceTxns = await prisma.transaction.findMany({
      where: {
        merchant_id,
        status: { in: ["completed", "failed"] },
        providerDetails: {
          path: ["deductionDone"],
          equals: false,
        },
        date_time: {
          lt: startOfTodayUTC, // everything strictly before today in PKT
        },
      },
      select: { providerDetails: true, transaction_id: true },
      orderBy: {
        date_time: 'desc'
      }
    });
    let deductionSourceTxns = originalDeductionSourceTxns.filter(
      (txn) => (txn.providerDetails as JsonObject).deduction != null
    );
    for (const t of deductionSourceTxns) {
      const pd = (t.providerDetails as JsonObject) || ({} as JsonObject);
      const raw: unknown = (pd as any)?.deduction;
      if (typeof raw === "number") {
        totalProviderDeduction = totalProviderDeduction.plus(new Decimal(raw));
      } else if (
        typeof raw === "string" &&
        raw.trim() !== "" &&
        !Number.isNaN(Number(raw))
      ) {
        totalProviderDeduction = totalProviderDeduction.plus(new Decimal(raw));
      }
    }
    console.log("Merchant Id: ", merchant_id)
    console.log("Total Deduction: ", totalProviderDeduction)
    // Update transactions and tasks
    await updateTransactionsAndTasks(
      tx,
      transactions,
      transactionIdToTaskIdMap
    );

    // if (totalProviderDeduction.gt(0)) {
    //   const wallet = (await calculateWalletBalanceWithTx(merchant_id, tx)) as {
    //     walletBalance?: Decimal | number;
    //   };
    //   const walletBalanceValue =
    //     wallet?.walletBalance instanceof Decimal
    //       ? wallet.walletBalance
    //       : new Decimal(wallet?.walletBalance ?? 0);
    //   if (walletBalanceValue > totalProviderDeduction) {
    //     await backofficeService.adjustMerchantWalletBalanceithTx(
    //       merchant_id,
    //       walletBalanceValue.minus(totalProviderDeduction).toNumber(),
    //       false,
    //       tx
    //     );
    //   }

    //   // Mark deductions as processed
    //   for (const txn of originalDeductionSourceTxns) {
    //     await tx.transaction.updateMany({
    //       where: { transaction_id: txn.transaction_id },
    //       data: {
    //         providerDetails: {
    //           ...(txn.providerDetails as JsonObject),
    //           deductionDone: true,
    //         } as unknown as Prisma.InputJsonValue,
    //       },
    //     });
    //   }
    // }

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
        transactionCount: settlementData?.transactionCount as number,
        transactionAmount: settlementData?.transactionAmount as Decimal,
        commission: settlementData?.totalCommission as Decimal,
        gst: settlementData?.totalGST as Decimal,
        withholdingTax: settlementData?.totalWithholdingTax as Decimal,
        merchantAmount: settlementData?.merchantAmount.minus(totalProviderDeduction) as Decimal,
        otpDeduction: totalProviderDeduction
      },
      update: {
        transactionCount: { increment: settlementData?.transactionCount as number },
        transactionAmount: { increment: settlementData?.transactionAmount },
        commission: { increment: settlementData?.totalCommission },
        gst: { increment: settlementData?.totalGST },
        withholdingTax: { increment: settlementData?.totalWithholdingTax },
        merchantAmount: { increment: settlementData?.merchantAmount.minus(totalProviderDeduction) },
        otpDeduction: { increment: totalProviderDeduction }
      },
    });




  } catch (err) {
    console.log(err)
  }
}

// // Function to calculate settlement data
// function calculateSettlementData(
//   transactions: Transaction[],
//   merchantFinancialTerms: MerchantFinancialTerms
// ) {
//   const transactionCount = transactions.length;
//   const transactionAmount = transactions.reduce(
//     (sum, t) => sum.plus(t.original_amount || new Prisma.Decimal(0)),
//     new Prisma.Decimal(0)
//   );

//   // Extract financial terms
//   const {
//     commissionRate,
//     commissionWithHoldingTax,
//     commissionGST,
//   } = merchantFinancialTerms;

//   // Calculate commission and taxes
//   const totalCommission = transactionAmount.mul(commissionRate);
//   const totalGST = transactionAmount.mul(commissionGST);
//   const totalWithholdingTax = transactionAmount.mul(commissionWithHoldingTax);

//   // Calculate merchant amount
//   const merchantAmount = transactionAmount
//     .minus(totalCommission)
//     .minus(totalGST)
//     .minus(totalWithholdingTax);

//   return {
//     transactionCount,
//     transactionAmount,
//     totalCommission,
//     totalGST,
//     totalWithholdingTax,
//     merchantAmount,
//   };
// }

// Modified settlement data calculation
function calculateSettlementData(
  transactions: Transaction[],
  merchantFinancialTerms: MerchantFinancialTerms
) {
  try {
    const transactionCount = transactions.length;
    const transactionAmount = transactions.reduce(
      (sum, t) => sum.plus(t.original_amount || new Prisma.Decimal(0)),
      new Prisma.Decimal(0)
    );

    let totalCommission = new Prisma.Decimal(0);
    let totalGST = new Prisma.Decimal(0);
    let totalWithholdingTax = new Prisma.Decimal(0);

    transactions.forEach((transaction) => {
      const providerName = (transaction.providerDetails as JsonObject)?.name;
      let commissionRate = merchantFinancialTerms.commissionRate;

      // Determine commission rate based on provider and commission mode
      if (merchantFinancialTerms.commissionMode == "DOUBLE") {
        if (providerName === "JazzCash") {
          commissionRate = merchantFinancialTerms.commissionRate;
        } else if (providerName === "Easypaisa") {
          commissionRate = merchantFinancialTerms.easypaisaRate || new Decimal(0);
        }
      }

      const transactionCommission = (transaction.original_amount || new Prisma.Decimal(0)).mul(commissionRate);
      totalCommission = totalCommission.plus(transactionCommission);

      // Calculate GST and Withholding Tax
      totalGST = totalGST.plus((transaction.original_amount || new Prisma.Decimal(0)).mul(merchantFinancialTerms.commissionGST));
      totalWithholdingTax = totalWithholdingTax.plus((transaction.original_amount || new Prisma.Decimal(0)).mul(merchantFinancialTerms.commissionWithHoldingTax));
    });

    const merchantAmount = transactionAmount.minus(totalCommission).minus(totalGST).minus(totalWithholdingTax);

    return {
      transactionCount,
      transactionAmount,
      totalCommission,
      totalGST,
      totalWithholdingTax,
      merchantAmount,
    };
  } catch (err) {
    console.log(err)
  }
}

// Function to update transactions and scheduled tasks
async function updateTransactionsAndTasks(
  prisma: Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
  transactions: Transaction[],
  transactionIdToTaskIdMap: Map<string, number>
) {
  try {
    // Update transactions as settled
    const transactionIds = transactions.map((t) => t.transaction_id);
    const CHUNK_SIZE = 5000;
    for (let i = 0; i < transactionIds.length; i += CHUNK_SIZE) {
      await prisma.transaction.updateMany({
        where: { transaction_id: { in: transactionIds.slice(i, i + CHUNK_SIZE) } },
        data: { settlement: true },
      });
    }

    // Update scheduled tasks as completed
    const taskIds = transactionIds
      .map((tid) => transactionIdToTaskIdMap.get(tid))
      .filter((id): id is number => id !== undefined);

    const today = new Date();

    // Define the Pakistan timezone
    const timeZone = 'Asia/Karachi';

    // Convert the date to the Pakistan timezone
    const zonedDate = toZonedTime(today, timeZone);
    for (let i = 0; i < transactionIds.length; i += CHUNK_SIZE) {
      await prisma.scheduledTask.updateMany({
        where: { id: { in: taskIds.slice(i, i + CHUNK_SIZE) }, status: 'pending' },
        data: { status: 'completed', executedAt: zonedDate },
      });
    }
  } catch (err) {
    console.log(err)
  }
}

export default task;