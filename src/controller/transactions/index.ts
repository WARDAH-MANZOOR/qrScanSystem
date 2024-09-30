// src/controllers/paymentController.ts
import { Request, Response, NextFunction } from "express";
import { JwtPayload } from "jsonwebtoken";
import { jazzCashService } from "services/index.js";
import ApiResponse from 'utils/ApiResponse.js';

const createTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const paymentData = req.body;
    let merchantId = (req.user as JwtPayload)?.id;
    const result = await jazzCashService.initiateJazzCashPayment(paymentData,merchantId);
    return res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

export default {
  createTransaction,
};
