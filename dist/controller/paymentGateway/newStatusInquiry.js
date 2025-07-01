import prisma from "prisma/client.js";
import { easyPaisaService, jazzCashService, swichService, transactionService } from "services/index.js";
import ApiResponse from "utils/ApiResponse.js";
import CustomError from "utils/custom_error.js";
const statusInquiry = async (req, res, next) => {
    try {
        const { merchantId } = req.params;
        const { transactionId } = req.query;
        const transaction = await prisma.transaction.findUnique({
            where: {
                merchant_transaction_id: transactionId
            }
        });
        if (!transaction) {
            throw new CustomError("Transaction Not Found", 500);
        }
        let result;
        if (transaction?.providerDetails?.name == "JazzCash") {
            result = await jazzCashService.statusInquiry(req.query, merchantId);
            res.status(200).json(ApiResponse.success(result));
            return;
        }
        else if (transaction?.providerDetails?.name == "Easypaisa") {
            const channel = (await transactionService.getMerchantChannel(merchantId))?.easypaisaPaymentMethod;
            const method = (await transactionService.getMerchantInquiryMethod(merchantId))?.easypaisaInquiryMethod;
            const obj = { ...req.query, orderId: req.query.transactionId };
            if (method == "WALLET") {
                if (channel == "DIRECT") {
                    result = await easyPaisaService.easypaisainquiry(obj, merchantId);
                }
                else {
                    result = await swichService.swichTxInquiry(obj.orderId, merchantId);
                }
            }
            else {
                result = await transactionService.getTransaction(merchantId, obj.orderId);
            }
            res.status(200).json(ApiResponse.success(result));
            return;
        }
        else {
            result = await transactionService.getTransaction(merchantId, transactionId);
        }
        res.status(200).json(ApiResponse.success(result));
        return;
    }
    catch (err) {
        next(err);
    }
};
export default { statusInquiry };
