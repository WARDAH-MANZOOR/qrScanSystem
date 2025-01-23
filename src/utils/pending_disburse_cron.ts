import { Prisma } from "@prisma/client";
import prisma from "prisma/client.js";
import { easyPaisaService, jazzCashService } from "services/index.js";
import { getToken, updateMwTransaction, updateTransaction } from "services/paymentGateway/index.js";

const fetchPendingRecords = async (size: number) => {
    console.log("Disbursement Cron running");

    try {
        return await prisma.$transaction(async (tx) => {
            const transactions = await tx.disbursement.findMany({
                where: {
                    status: 'pending', // Filter for pending transactions
                },
                // select: {
                //     system_order_id: true,
                //     merchant_id: true,
                // },
                take: size
            });

            // await tx.disbursement.deleteMany({
            //     where: {
            //         status: 'pending',
            //     }
            // })

            const merchantTransactions = transactions.reduce((acc: { [key: number]: any[] }, txn) => {
                if (!acc[txn.merchant_id]) {
                    acc[txn.merchant_id] = [];
                }
                acc[txn.merchant_id].push(txn);
                return acc;
            }, {});
            return merchantTransactions
        }, {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: 3600000,
            maxWait: 3600000
        });
    } catch (error) {
        console.error("Error during settlement process:", error);
        // Handle error appropriately, possibly re-throw or log
    }
};

async function processPendingRecordsCron() {
    const batchSize = 900; // Number of records to process per cron job
    const records: { [key: string]: any[] } = await fetchPendingRecords(batchSize) as { [key: string]: any[] };

    if (!records || Object.keys(records).length === 0) {
        console.log("No pending records found.");
        return;
    }
    // console.log(records)
    try {
        for (const merchantId of Object.keys(records)) {
            // console.log(merchantId)
            const txns = records[merchantId]
            const merchant = await prisma.merchant.findFirst({
                where: {
                    merchant_id: +merchantId
                }
            })
            for (const txn of txns) {
                console.log(txn)
                if (txn.provider?.toUpperCase() == "EASYPAISA") {
                    if (txn.to_provider?.toUpperCase() == "EASYPAISA") {
                        console.log(`${txn.provider} -> ${txn.to_provider}`)
                        await easyPaisaService.updateDisbursement(txn, merchant?.uid as string)
                    }
                    else {
                        console.log(`${txn.provider} -> ${txn.to_provider}`)
                        await easyPaisaService.updateDisburseThroughBank(txn, merchant?.uid as string)
                    }
                }
                else {
                    if (txn.to_provider.toUpperCase() == "JAZZCASH") {
                        console.log(`${txn.provider} -> ${txn.to_provider}`)
                        const token = await getToken(merchant?.uid as string);
                        await updateMwTransaction(token?.access_token, txn, merchant?.uid as string)
                    }
                    else {
                        console.log(`${txn.provider} -> ${txn.to_provider}`)
                        const token = await getToken(merchant?.uid as string);
                        await updateTransaction(token?.access_token, txn, merchant?.uid as string)
                    }
                }
            }
            // console.log(`records[${merchantId}] =  ${txns}`)
        } 
    }
    catch (err) {
        console.log("Error: ",err)
    }
}

export default processPendingRecordsCron