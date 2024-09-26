// src/controllers/paymentController.ts
import { Request, Response, NextFunction } from "express";
import { jazzCashService } from "services/index.js"; // Import service layer

const initiateJazzCash = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const paymentData = req.body; // Extract data from request body
    const result = await jazzCashService.initiateJazzCashPayment(paymentData);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error); // Pass error to error handling middleware
  }
};

export default {
  initiateJazzCash,
};
