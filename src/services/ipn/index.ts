import { JsonObject } from "@prisma/client/runtime/library";
import prisma from "prisma/client.js";
import { transactionService } from "services/index.js";
import CustomError from "utils/custom_error.js";

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
        if (requestBody.pp_ResponseCode == "121") {
            const txn = await prisma.transaction.findUnique({
                where: {
                    merchant_transaction_id: requestBody.pp_TxnRefNo
                }
            })
            await prisma.transaction.update({
                where: {
                    merchant_transaction_id: requestBody.pp_TxnRefNo
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
                    }
                })
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
            await prisma.transaction.update({
                where: {
                    merchant_transaction_id: requestBody.pp_TxnRefNo
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

export default { processIPN };