import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";
import { JwtPayload } from "jsonwebtoken";
import getWalletBalance from "services/paymentGateway/disbursement/index.js";
import ApiResponse from "utils/ApiResponse.js";

const getWalletBalanceController = async (req: Request, res: Response, next: NextFunction) => {
    const merchantId = (req.user as JwtPayload)?.id;

    if (!merchantId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const balance = await getWalletBalance(merchantId);
        res.status(200).json(ApiResponse.success({ balance }));
    } catch (error) {
        next(error); // Pass the error to the error handling middleware
    }
}

export default getWalletBalanceController;