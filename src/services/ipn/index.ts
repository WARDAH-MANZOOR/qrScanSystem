import { JsonObject, JsonValue } from "@prisma/client/runtime/library";
import prisma from "prisma/client.js";
import { transactionService } from "services/index.js";
import CustomError from "utils/custom_error.js";
import { addWeekdays } from "utils/date_method.js";
import CryptoJS from "crypto-js"
import axios from "axios";
import { PROVIDERS } from "constants/providers.js";

// Interface for Raast QR IPN request body with custom field names
export interface RaastQRRequestBody {
    order_id: string;
    'Transection Id': string;
    status?: string;
    response_message?: string;
}

// Example of the request body fields from other payment gateways
export interface PaymentRequestBody {
    pp_Version: string;
    pp_TxnType: string;
    pp_BankID?: string;
    pp_ProductID?: string | null;
    pp_Password: string;
    pp_TxnRefNo: string;
    pp_TxnDateTime: string;
    pp_ResponseCode: string;
    pp_ResponseMessage: string;
    pp_AuthCode: string;
    pp_SettlementExpiry?: string | null;
    pp_RetreivalReferenceNo: string;
    pp_SecureHash: string;
}

export interface PaymentResponse {
    pp_ResponseCode: string;
    pp_ResponseMessage: string;
    pp_SecureHash: string;
    returnUrl?: string
}

const processIPN = async (requestBody: PaymentRequestBody): Promise<PaymentResponse> => {
    try {
        console.log(JSON.stringify({ event: "IPN_RECIEVED", order_id: requestBody.pp_TxnRefNo, requestBody }))
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
        })
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
            })
            if (txn?.status != "completed") {
                const findMerchant = await prisma.merchant.findUnique({
                    where: {
                        merchant_id: txn?.merchant_id
                    },
                    include: {
                        commissions: true
                    }
                })
                const scheduledAt = addWeekdays(new Date(), findMerchant?.commissions[0].settlementDuration as number);  // Call the function to get the next 2 weekdays
                console.log(scheduledAt)
                const transaction = await prisma.scheduledTask.findUnique({
                    where: {
                        transactionId: txn?.transaction_id
                    }
                })
                if (!transaction) {
                    let scheduledTask = await prisma.scheduledTask.create({
                        data: {
                            transactionId: txn?.transaction_id,
                            status: "pending",
                            scheduledAt: scheduledAt, // Assign the calculated weekday date
                            executedAt: null, // Assume executedAt is null when scheduling
                        },
                    });
                }
                setTimeout(async () => {
                    transactionService.sendCallback(
                        findMerchant?.webhook_url as string,
                        txn,
                        (txn?.providerDetails as JsonObject)?.account as string,
                        "payin",
                        findMerchant?.encrypted == "True" ? true : false,
                        false
                    )
                }, 30000)
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
            })
        }

        // Forward IPN to upstream JazzCash IPN endpoint (AssanPay)
        try {
            const newStatus = requestBody.pp_ResponseCode === "121" ? "000" : requestBody.pp_ResponseCode;
            const forwardRes = await axios.post(
                "https://easypaisa-server-setup.assanpay.com/api/jazzcash/transactions/ipn",
                {
                    order_id: requestBody.pp_TxnRefNo,
                    status: newStatus,
                    response_message: requestBody.pp_ResponseMessage || null,
                },
                {
                    headers: { "Content-Type": "application/json" },
                    timeout: 15000,
                }
            );
            console.log(JSON.stringify({ event: "JAZZCASH_IPN_FORWARDED", upstream: forwardRes?.data }));
        } catch (forwardErr: any) {
            console.log(JSON.stringify({ event: "JAZZCASH_IPN_FORWARD_FAILED", error: forwardErr?.message }));
        }

        // Return existing success response to caller
        return {
            pp_ResponseCode: '000',
            pp_ResponseMessage: 'IPN received successfully',
            pp_SecureHash: '',  // Fill in as needed
        };
    }
    catch (error: any) {
        throw new CustomError(error.message, 500);
    }
}

const processCardIPN = async (requestBody: { data: any }): Promise<PaymentResponse> => {
    try {
        console.log(JSON.stringify({ event: "IPN_RECIEVED", requestBody }))
        const bytes = CryptoJS.AES.decrypt(requestBody?.data, process.env.ENCRYPTION_KEY as string);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        console.log(decrypted)
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
        })
        if (!txn) {
            throw new CustomError("Transaction Not Found", 500);
        }
        const merchant = await prisma.merchant.findFirst({
            where: {
                merchant_id: txn?.merchant?.id
            }
        })
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
                    response_message: pp_ResponseMessage,
                    providerDetails: {
                        ...(txn.providerDetails as JsonObject),
                        name: PROVIDERS.CARD
                    }
                }
            })
            const requestId = (txn?.providerDetails as JsonObject)?.payId as string | undefined;
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
                })
                const scheduledAt = addWeekdays(new Date(), findMerchant?.commissions[0].settlementDuration as number);  // Call the function to get the next 2 weekdays
                console.log(scheduledAt)
                const transaction = await prisma.scheduledTask.findUnique({
                    where: {
                        transactionId: txn.transaction_id
                    }
                })
                if (!transaction) {
                    let scheduledTask = await prisma.scheduledTask.create({
                        data: {
                            transactionId: txn.transaction_id,
                            status: "pending",
                            scheduledAt: scheduledAt, // Assign the calculated weekday date
                            executedAt: null, // Assume executedAt is null when scheduling
                        },
                    });
                }
                setTimeout(async () => {
                    transactionService.sendCallback(
                        findMerchant?.webhook_url as string,
                        txn,
                        (txn?.providerDetails as JsonObject)?.account as string,
                        "payin",
                        findMerchant?.encrypted == "True" ? true : false,
                        false
                    )
                }, 30000)
            }
        }
        else {
            const requestId = (txn?.providerDetails as JsonObject)?.payId as string | undefined;
            await prisma.paymentRequest.update({
                where: {
                    id: requestId
                },
                data: {
                    status: "failed",
                    updatedAt: new Date()
                }
            });
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
                    response_message: pp_ResponseMessage,
                    providerDetails: {
                        ...(txn.providerDetails as JsonObject),
                        name: PROVIDERS.CARD
                    }
                }
            })
        }
        console.log(merchant)
        if (merchant?.wooMerchantId) {
            await updateWooOrderStatus(merchant?.wooMerchantId, pp_TxnRefNo, pp_ResponseCode)
        }
        // Example: If pp_TxnType === "MWALLET", return success response
        return {
            pp_ResponseCode: '000',
            pp_ResponseMessage: 'IPN received successfully',
            pp_SecureHash: '',  // Fill in as needed
            returnUrl: String((txn?.providerDetails as JsonObject)?.returnUrl || '')
        };
    }
    catch (error: any) {
        throw new CustomError(error.message, 500);
    }
}

export const updateWooOrderStatus = async (wooId: number, orderId: string, responseCode: string) => {
    try {
        console.log("Update Method")
        const wooMerchant = await prisma.woocommerceMerchants.findUnique({
            where: {
                id: wooId
            }
        });
        console.log(wooMerchant)
        if (!wooMerchant) {
            throw new CustomError("Woo Commerce Merchant Not Assigned", 500);
        }
        orderId = extractOrderNumberFromTxnId(orderId) as string
        console.log(orderId)
        if (!orderId) {
            throw new CustomError("Woo Commerce Merchant Not Assigned", 500);
        }
        console.log(responseCode == "000" ? "completed" : "failed")
        const res = await axios.put(`${wooMerchant?.baseUrl}/wp-json/wc/v3/orders/${orderId}`, {
            status: responseCode == "000" ? "completed" : "failed"
        },
            {
                headers: {
                    Authorization: `Basic ${toBase64(`${wooMerchant?.username}:${wooMerchant?.password}`)}`
                }
            })
        console.log(res)
        return res;
    }
    catch (err: any) {

    }
}

function extractOrderNumberFromTxnId(txnId: string) {
    const wpIndex = txnId.indexOf('W');
    if (wpIndex === -1) return null; // WP not found

    // Extract everything before 'WP'
    return txnId.substring(0, wpIndex);
}

function toBase64(str: string) {
    return Buffer.from(str).toString('base64');
}

const bdtIPN = (body: any) => {
    console.log("Body: ",body);
    return body;
}

// Raast QR IPN Processing
const processRaastQRIPN = async (requestBody: RaastQRRequestBody): Promise<any> => {
    try {
        // Log the incoming IPN
        console.log(JSON.stringify({
            event: "RAAST_QR_IPN_RECEIVED",
            requestBody
        }));

        // Extract the required fields
        const { order_id, 'Transection Id': transaction_id, status, response_message } = requestBody;

        // Validate required fields
        if (!order_id || !transaction_id) {
            throw new CustomError("Missing required fields: order_id or Transection Id", 400);
        }

        // Find the transaction in the database
        const txn = await prisma.transaction.findFirst({
            where: {
                OR: [
                    {
                        merchant_transaction_id: order_id
                    },
                    {
                        transaction_id: order_id
                    }
                ]
            }
        });

        if (!txn) {
            throw new CustomError("Transaction Not Found", 500);
        }

        // Determine the status based on the status field (if provided) or fallback to transaction_id logic
        const finalStatus = status || "completed"; // For now, we'll keep it simple

        // Update the transaction status based on the IPN status
        if (finalStatus === "completed") {
            await prisma.transaction.updateMany({
                where: {
                    OR: [
                        {
                            merchant_transaction_id: order_id
                        },
                        {
                            transaction_id: order_id
                        }
                    ]
                },
                data: {
                    status: "completed",
                    response_message: response_message || "Payment completed successfully",
                    providerDetails: {
                        ...(txn.providerDetails as JsonObject),
                        transactionId: transaction_id
                    }
                }
            });

            // Handle scheduled tasks if needed
            if (txn?.status !== "completed") {
                // Send callback notification to merchant
                const findMerchant = await prisma.merchant.findUnique({
                    where: {
                        merchant_id: txn?.merchant_id
                    },
                    include: {
                        commissions: true
                    }
                });

                if (findMerchant && findMerchant.webhook_url) {
                    setTimeout(async () => {
                        transactionService.sendCallback(
                            findMerchant?.webhook_url as string,
                            txn,
                            (txn?.providerDetails as JsonObject)?.account as string,
                            "payin",
                            findMerchant?.encrypted == "True" ? true : false,
                            false
                        );
                    }, 30000); // Delay 30 seconds to ensure all processing is complete
                }
            }
        } else {
            // For failed or pending status, update accordingly
            await prisma.transaction.updateMany({
                where: {
                    OR: [
                        {
                            merchant_transaction_id: order_id
                        },
                        {
                            transaction_id: order_id
                        }
                    ]
                },
                data: {
                    status: finalStatus === "failed" ? "failed" : "pending",
                    response_message: response_message || "Payment status updated",
                    providerDetails: {
                        ...(txn.providerDetails as JsonObject),
                        transactionId: transaction_id
                    }
                }
            });
        }

        // Return success response
        return {
            status: "success",
            message: "Raast QR IPN processed successfully",
            order_id: order_id,
            transaction_id: transaction_id
        };
    } catch (error: any) {
        console.error("Raast QR IPN Processing Error:", error);
        throw new CustomError(error.message, 500);
    }
};

export default { processIPN, processCardIPN, bdtIPN, processRaastQRIPN };