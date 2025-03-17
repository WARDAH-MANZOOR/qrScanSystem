import { NextFunction, Request, Response } from "express";
import { payfast } from "services/index.js";
import ApiResponse from "utils/ApiResponse.js";
import CustomError from "utils/custom_error.js";

const pay = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = await payfast.getApiToken(req.params.merchantId, req.body);
        if (!token?.token) {
            throw new CustomError("No Token Recieved", 500);
        }
        const validation = await payfast.validateCustomerInformation(req.params.merchantId, {
            token: token?.token,
            bankCode: '13',
            ...req.body
        })
        if (!validation?.transaction_id) {
            throw new CustomError("No Transaction ID Recieved", 500);
        }
        const payment = await payfast.pay(req.params.merchantId, {
            token: token?.token,
            bankCode: '13',
            transaction_id: validation?.transaction_id,
            ...req.body
        }) 
        res.status(200).json(ApiResponse.success(payment));
    }
    catch(err) {
        next(err);
    }
}

export default {pay}