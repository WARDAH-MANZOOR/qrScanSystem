import prisma from "../../prisma/client.js";
import CustomError from "../../utils/custom_error.js";
const processIPN = async (requestBody) => {
    try {
        if (requestBody.pp_ResponseCode == "121") {
            await prisma.transaction.update({
                where: {
                    merchant_transaction_id: requestBody.pp_TxnRefNo
                },
                data: {
                    status: "completed",
                    response_message: requestBody.pp_ResponseMessage
                }
            });
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
export default { processIPN };
