import { NextFunction, Request, Response } from "express";
import { JwtPayload } from "jsonwebtoken";
import { refundService } from "services/index.js";
import { getToken } from "services/paymentGateway/index.js";
import ApiResponse from "utils/ApiResponse.js";
import CustomError from "utils/custom_error.js";

const refundMWDisbursement = async (req: Request, res: Response, next: NextFunction) => {
    try {
        process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
        const token = await getToken(req.params.merchantId);
        const initTransaction = await refundService.refundMwTransaction(token?.access_token, req.body, req.params.merchantId);

        res.status(200).json(ApiResponse.success(initTransaction));
    }
    catch (err) {
        next(err)
    }
}

const refundDisbursmentClone = async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log("IBFT Called")
        process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
        if (req.body.amount <= 1) {
            throw new CustomError("Amount should be greater than 0", 400);
        }
        const token = await getToken(req.params.merchantId);
        const initTransaction = await refundService.refundIBFTTransaction(token?.access_token, req.body, req.params.merchantId);
        res.status(200).json(ApiResponse.success(initTransaction));
    }
    catch (err) {
        next(err)
    }
}

const getRefund = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { query } = req;
      const id = (req.user as JwtPayload)?.merchant_id || query.merchant_id;
      const merchant = await refundService.getRefund(id, query);
      res.status(200).json(ApiResponse.success(merchant));
    } catch (error) {
      next(error);
    }
  }

export default {
    refundDisbursmentClone,
    refundMWDisbursement,
    getRefund
}