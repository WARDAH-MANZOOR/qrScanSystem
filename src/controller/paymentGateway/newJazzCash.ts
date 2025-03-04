import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";
import { jazzCashService } from "services/index.js";
import ApiResponse from "utils/ApiResponse.js";

const initiateJazzCash = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const paymentData = req.body;
        console.log("Payment Data: ", paymentData)

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json(ApiResponse.error(errors.array()[0] as unknown as string))
            return;
        }
        let merchantId = req.params?.merchantId;

        if (!merchantId) {
            res.status(400).json(ApiResponse.error("Merchant ID is required"));
            return;
        }

        const result: any = await jazzCashService.initiateJazzCashPayment(paymentData, merchantId);
        if (result.statusCode != "000") {
            res.status(result.statusCode != 500 ? result.statusCode : 201).send(ApiResponse.error(result, result.statusCode != 500 ? result.statusCode : 201));
            return;
        }
        res.status(200).json(ApiResponse.success(result));
    } catch (error) {
        next(error);
    }
};