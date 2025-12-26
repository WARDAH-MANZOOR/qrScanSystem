import { JsonObject } from "@prisma/client/runtime/library";
import { Request, Response, NextFunction } from "express";
import prisma from "prisma/client.js";
import { easyPaisaService, jazzCashService, swichService, transactionService } from "services/index.js";
import ApiResponse from "utils/ApiResponse.js";
import CustomError from "utils/custom_error.js";

const statusInquiry = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { merchantId } = req.params;
        const { transactionId } = req.query;
        const transaction = await prisma.transaction.findUnique({
            where: {
                merchant_transaction_id: transactionId as string
            }
        })
        if (!transaction) {
            throw new CustomError("Transaction Not Found", 500)
        }
        let result;
        if ((transaction?.providerDetails as JsonObject)?.name as string == "JazzCash") {
            result = await jazzCashService.statusInquiry(req.query, merchantId)
            res.status(200).json(ApiResponse.success(result))
            return;
        }
        else if ((transaction?.providerDetails as JsonObject)?.name as string == "Easypaisa") {
            const channel = (await transactionService.getMerchantChannel(merchantId))?.easypaisaPaymentMethod;
            const method = (await transactionService.getMerchantInquiryMethod(merchantId))?.easypaisaInquiryMethod;
            const obj = {...req.query, orderId: req.query.transactionId}
            if (method == "WALLET") {
                if (channel == "DIRECT") {
                    result = await easyPaisaService.easypaisainquiry(obj, merchantId);
                }
                else {
                    result = await swichService.swichTxInquiry(
                        obj.orderId as string,
                        merchantId as string
                    );
                }
            }
            else {
                result = await transactionService.getTransaction(merchantId as string, obj.orderId as string)
            }
            res.status(200).json(ApiResponse.success(result))
            return;
        }
        else {
            result = await transactionService.getTransaction(merchantId as string, transactionId as string)
        }
        res.status(200).json(ApiResponse.success(result))
        return;
    }
    catch (err) {
        next(err)
    }
}

export default { statusInquiry }