import prisma from "prisma/client.js";
import { transactionService } from "services/index.js";
import CustomError from "utils/custom_error.js";
import { addWeekdays } from "utils/date_method.js";
import CryptoJS from "crypto-js";
import axios from "axios";
const processIPN = async (requestBody) => {
    try {
        console.log(JSON.stringify({ event: "IPN_RECIEVED", order_id: requestBody.pp_TxnRefNo, requestBody }));
        const txn = await prisma.transaction.findFirst({
            where: {
                OR: [
                    {
                        merchant_transaction_id: requestBody.pp_TxnRefNo
                    },
                    {
                        transaction_id: requestBody.pp_TxnRefNo
                    }
                ]
            }
        });
        if (!txn) {
            throw new CustomError("Transaction Not Found", 500);
        }
        if (requestBody.pp_ResponseCode == "121") {
            await prisma.transaction.updateMany({
                where: {
                    OR: [
                        {
                            merchant_transaction_id: requestBody.pp_TxnRefNo
                        },
                        {
                            transaction_id: requestBody.pp_TxnRefNo
                        }
                    ]
                },
                data: {
                    status: "completed",
                    response_message: requestBody.pp_ResponseMessage
                }
            });
            if (txn?.status != "completed") {
                const findMerchant = await prisma.merchant.findUnique({
                    where: {
                        merchant_id: txn?.merchant_id
                    },
                    include: {
                        commissions: true
                    }
                });
                const scheduledAt = addWeekdays(new Date(), findMerchant?.commissions[0].settlementDuration); // Call the function to get the next 2 weekdays
                console.log(scheduledAt);
                let scheduledTask = await prisma.scheduledTask.create({
                    data: {
                        transactionId: txn?.transaction_id,
                        status: 'pending',
                        scheduledAt: scheduledAt, // Assign the calculated weekday date
                        executedAt: null, // Assume executedAt is null when scheduling
                    }
                });
                setTimeout(async () => {
                    transactionService.sendCallback(findMerchant?.webhook_url, txn, txn?.providerDetails?.account, "payin", findMerchant?.encrypted == "True" ? true : false, false);
                }, 30000);
            }
        }
        else if (requestBody.pp_ResponseCode == "199" || requestBody.pp_ResponseCode == "999") {
            await prisma.transaction.updateMany({
                where: {
                    OR: [
                        {
                            merchant_transaction_id: requestBody.pp_TxnRefNo
                        },
                        {
                            transaction_id: requestBody.pp_TxnRefNo
                        }
                    ]
                },
                data: {
                    status: "failed",
                    response_message: requestBody.pp_ResponseMessage
                }
            });
        }
        // Example: If pp_TxnType === "MWALLET", return success response
        return {
            pp_ResponseCode: '000',
            pp_ResponseMessage: 'IPN received successfully',
            pp_SecureHash: '', // Fill in as needed
        };
    }
    catch (error) {
        throw new CustomError(error.message, 500);
    }
};
const processCardIPN = async (requestBody) => {
    try {
        console.log(JSON.stringify({ event: "IPN_RECIEVED", requestBody }));
        const bytes = CryptoJS.AES.decrypt(requestBody?.data, process.env.ENCRYPTION_KEY);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        console.log(decrypted);
        const { pp_TxnRefNo, pp_ResponseCode, pp_ResponseMessage } = JSON.parse(decrypted);
        const txn = await prisma.transaction.findFirst({
            where: {
                OR: [
                    {
                        merchant_transaction_id: pp_TxnRefNo
                    },
                    {
                        transaction_id: pp_TxnRefNo
                    }
                ]
            },
            include: {
                merchant: true
            }
        });
        if (!txn) {
            throw new CustomError("Transaction Not Found", 500);
        }
        const merchant = await prisma.merchant.findFirst({
            where: {
                merchant_id: txn?.merchant?.id
            }
        });
        if (pp_ResponseCode == "000") {
            await prisma.transaction.updateMany({
                where: {
                    OR: [
                        {
                            merchant_transaction_id: pp_TxnRefNo
                        },
                        {
                            transaction_id: pp_TxnRefNo
                        }
                    ]
                },
                data: {
                    status: "completed",
                    response_message: pp_ResponseMessage
                }
            });
            const requestId = txn?.providerDetails?.requestId;
            if (requestId) {
                await prisma.paymentRequest.update({
                    where: {
                        id: requestId
                    },
                    data: {
                        status: "paid",
                        updatedAt: new Date()
                    }
                });
            }
            if (txn?.status != "completed") {
                const findMerchant = await prisma.merchant.findUnique({
                    where: {
                        merchant_id: txn?.merchant_id
                    },
                    include: {
                        commissions: true
                    }
                });
                const scheduledAt = addWeekdays(new Date(), findMerchant?.commissions[0].settlementDuration); // Call the function to get the next 2 weekdays
                console.log(scheduledAt);
                let scheduledTask = await prisma.scheduledTask.create({
                    data: {
                        transactionId: txn?.transaction_id,
                        status: 'pending',
                        scheduledAt: scheduledAt, // Assign the calculated weekday date
                        executedAt: null, // Assume executedAt is null when scheduling
                    }
                });
                setTimeout(async () => {
                    transactionService.sendCallback(findMerchant?.webhook_url, txn, txn?.providerDetails?.account, "payin", findMerchant?.encrypted == "True" ? true : false, false);
                }, 30000);
            }
        }
        else {
            await prisma.transaction.updateMany({
                where: {
                    OR: [
                        {
                            merchant_transaction_id: pp_TxnRefNo
                        },
                        {
                            transaction_id: pp_TxnRefNo
                        }
                    ]
                },
                data: {
                    status: "failed",
                    response_message: pp_ResponseMessage
                }
            });
        }
        console.log(merchant);
        if (merchant?.wooMerchantId) {
            await updateWooOrderStatus(merchant?.wooMerchantId, pp_TxnRefNo, pp_ResponseCode);
        }
        // Example: If pp_TxnType === "MWALLET", return success response
        return {
            pp_ResponseCode: '000',
            pp_ResponseMessage: 'IPN received successfully',
            pp_SecureHash: '', // Fill in as needed
            returnUrl: String(txn?.providerDetails?.returnUrl || '')
        };
    }
    catch (error) {
        throw new CustomError(error.message, 500);
    }
};
const updateWooOrderStatus = async (wooId, orderId, responseCode) => {
    try {
        console.log("Update Method");
        const wooMerchant = await prisma.woocommerceMerchants.findUnique({
            where: {
                id: wooId
            }
        });
        console.log(wooMerchant);
        if (!wooMerchant) {
            throw new CustomError("Woo Commerce Merchant Not Assigned", 500);
        }
        orderId = extractOrderNumberFromTxnId(orderId);
        console.log(orderId);
        if (!orderId) {
            throw new CustomError("Woo Commerce Merchant Not Assigned", 500);
        }
        const res = await axios.put(`${wooMerchant?.baseUrl}/wp-json/wc/v3/orders/${orderId}`, {
            status: responseCode == "000" ? "completed" : "failed"
        }, {
            headers: {
                Authorization: `Basic ${toBase64(`${wooMerchant?.username}:${wooMerchant?.password}`)}`
            }
        });
        return res;
    }
    catch (err) {
    }
};
function extractOrderNumberFromTxnId(txnId) {
    const wpIndex = txnId.indexOf('WP');
    if (wpIndex === -1)
        return null; // WP not found
    // Extract everything after 'WP'
    return txnId.substring(wpIndex + 2);
}
function toBase64(str) {
    return Buffer.from(str).toString('base64');
}
const bdtIPN = (body) => {
    console.log("Body: ", body);
    return body;
};
export default { processIPN, processCardIPN, bdtIPN };
