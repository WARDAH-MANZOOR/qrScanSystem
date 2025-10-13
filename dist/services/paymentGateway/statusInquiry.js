import prisma from "prisma/client.js";
import CustomError from "utils/custom_error.js";
const statusInquiry = async (merchantId, transactionId) => {
    try {
        let merchant = await prisma.merchant.findFirst({
            where: { uid: merchantId },
            include: {
                jazzCashMerchant: true,
            },
        });
        console.log(merchant);
        if (!merchant) {
            throw new CustomError("Merchant Not Found", 400);
        }
        if (!transactionId || typeof transactionId !== 'string') {
            throw new CustomError('Invalid or missing merchant_transaction_id');
        }
        const txn = await prisma.transaction.findFirst({
            where: {
                merchant_transaction_id: transactionId,
                // merchant_id: merchant?.merchant_id,
            }
        });
        if (!txn) {
            console.log("Transaction");
            throw new CustomError("Transaction Not Found", 400);
        }
        return {
            "orderId": txn?.merchant_transaction_id,
            "transactionStatus": txn.status.slice(0, 1).toUpperCase() + txn.status.slice(1),
            "transactionAmount": txn?.original_amount,
            "transactionDateTime": txn?.date_time,
            "msisdn": txn?.providerDetails?.msisdn,
            "responseDesc": txn?.response_message,
            "responseMode": "MA",
        };
    }
    catch (err) {
        return {
            message: err?.message || "An Error Occured",
            statusCode: err?.statusCode || 500
        };
    }
};
export default {
    statusInquiry
};
