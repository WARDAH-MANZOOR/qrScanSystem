// src/controllers/paymentController.ts
import { Request, Response, NextFunction } from "express";
import { jazzCashService } from "services/index.js";
import ApiResponse from 'utils/ApiResponse.js';

const initiateJazzCash = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const paymentData = req.body;
    const result = await jazzCashService.initiateJazzCashPayment(paymentData);
    return res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

export default {
  initiateJazzCash,
};
