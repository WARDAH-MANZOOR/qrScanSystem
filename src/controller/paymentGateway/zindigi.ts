import { NextFunction, Request, Response } from "express";
import { zindigiService } from "services/index.js";
import ApiResponse from "utils/ApiResponse.js";

const walletToWalletPaymentController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Step 1: Attempt to fetch the existing client secret
        let clientSecret = await zindigiService.fetchExistingClientSecret();

        // Step 2: Attempt to use the client secret with the target API
        let isValid = await zindigiService.walletToWalletPayment(req.body,clientSecret);

        if(!isValid.success) {
            console.log('Existing client secret is invalid. Generating a new one...');
            clientSecret = await zindigiService.generateNewClientSecret();

            // Retry using the new client secret
            isValid = await zindigiService.walletToWalletPayment(req.body,clientSecret);

            if (!isValid) {
                throw new Error('Failed to use the new client secret with the API.');
            }
        }
        return res.status(200).json(ApiResponse.success(isValid.data));
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