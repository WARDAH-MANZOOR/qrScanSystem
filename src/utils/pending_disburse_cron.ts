import prisma from "prisma/client.js";

const task = async () => {
    console.log("Disbursement Cron running");

    try {
        await prisma.$transaction(async (tx) => {
            const transactions = await prisma.disbursement.findMany({
                where: {
                    status: 'pending', // Filter for pending transactions
                },
                select: {
                    system_order_id: true,
                    merchant_id: true,
                },
            });
            
            const merchantTransactions = transactions.reduce((acc: { [key: number]: string[] }, txn) => {
                if (!acc[txn.merchant_id]) {
                    acc[txn.merchant_id] = [];
                }
                acc[txn.merchant_id].push(txn.system_order_id as string);
                return acc;
            }, {});
        
            for (const [merchantId, transactionIds] of Object.entries(merchantTransactions)) {
                // await performActionOnTransactions(merchantId, transactionIds);
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

export default task