import { JsonObject, JsonValue } from "@prisma/client/runtime/library";
import prisma from "prisma/client.js";
import { transactionService } from "services/index.js";
import CustomError from "utils/custom_error.js";
import { addWeekdays } from "utils/date_method.js";
import CryptoJS from "crypto-js"

// Example of the request body fields
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
                let scheduledTask = await prisma.scheduledTask.create({
                    data: {
                        transactionId: txn?.transaction_id,
                        status: 'pending',
                        scheduledAt: scheduledAt,  // Assign the calculated weekday date
                        executedAt: null,  // Assume executedAt is null when scheduling
                    }
                });
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

        // Example: If pp_TxnType === "MWALLET", return success response
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
            }
        })
        if (!txn) {
            throw new CustomError("Transaction Not Found", 500);
        }
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
            })
            const requestId = (txn?.providerDetails as JsonObject)?.requestId as string | undefined;
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
                let scheduledTask = await prisma.scheduledTask.create({
                    data: {
                        transactionId: txn?.transaction_id,
                        status: 'pending',
                        scheduledAt: scheduledAt,  // Assign the calculated weekday date
                        executedAt: null,  // Assume executedAt is null when scheduling
                    }
                });
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
            })
        }

        // Example: If pp_TxnType === "MWALLET", return success response
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

export default { processIPN, processCardIPN };