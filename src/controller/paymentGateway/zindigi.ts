import { NextFunction, Request, Response } from "express";
import { zindigiService } from "services/index.js";
import ApiResponse from "utils/ApiResponse.js";

const walletToWalletPaymentController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const response = await zindigiService.walletToWalletPayment(req.body);
        return res.status(200).json(ApiResponse.success(response));
    }
    catch(err) {
        next(err);
    }
}

const debitInquiryController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const response = await zindigiService.debitInquiry(req.body);
        const response2 = await zindigiService.debitPayment(req.body,response);
        return res.status(200).json(ApiResponse.success(response2));
    }
    catch(err) {
        next(err)
    }
}

const transactionInquiryController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const response = await zindigiService.transactionInquiry(req.body);
        return res.status(200).json(ApiResponse.success(response));
    }
    catch(err) {
        next(err);
    }
}

export default {walletToWalletPaymentController, debitInquiryController, transactionInquiryController}