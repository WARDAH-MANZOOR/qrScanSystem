import { Decimal } from "@prisma/client/runtime/library";
import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";
import { JwtPayload } from "jsonwebtoken";
import prisma from "../../prisma/client.js";
import {
  calculateDisbursement,
  calculateMerchantBalanceWithDateRange,
  getDisbursementBalanceWithKey,
  getEligibleTransactions,
  getMerchantRate,
  getWalletBalance,
  getWalletBalanceWithKey,
  updateTransactions,
} from "../../services/paymentGateway/disbursement.js";
import ApiResponse from "../../utils/ApiResponse.js";
import CustomError from "../../utils/custom_error.js";

const getWalletBalanceController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const merchant_id = (req.user as JwtPayload)?.merchant_id;
  if (!merchant_id) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  try {
    const balance: any = await getWalletBalance(merchant_id);
    res.status(200).json(ApiResponse.success({ ...balance }));
  } catch (error) {
    next(error); // Pass the error to the error handling middleware
  }
};
const getAllMerchantsWalletBalancesController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    // Parse date filters (optional)
    const start = startDate ? new Date(startDate as string) : null;
    const end = endDate ? new Date(endDate as string) : null;

    // Get all merchants
    const merchants = await prisma.merchant.findMany({
    select: {
      merchant_id: true,
      uid:true,
      user_id:true,
      full_name: true,
      company_name:true

    },
  });

    const balances = [];

    for (const merchant of merchants) {
      const balance = await calculateMerchantBalanceWithDateRange(merchant.merchant_id, start, end);
      balances.push({
        merchantId: merchant.merchant_id,
        uid: merchant.uid,
        userId: merchant.user_id,
        UserName: merchant.full_name,
        companyName: merchant.company_name,
        ...balance,
      });
    }

    // Sort by highest wallet balance
    balances.sort((a, b) => b.walletBalance - a.walletBalance);

    res.status(200).json(ApiResponse.success(balances));
  } catch (error) {
    next(error);
  }
};

const getWalletBalanceControllerWithKey = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const merchantId = req.params.merchantId;
  if (!merchantId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  try {
    const balance: any = await getWalletBalanceWithKey(merchantId);
    res.status(200).json(ApiResponse.success({ ...balance }));
  } catch (error) {
    next(error); // Pass the error to the error handling middleware
  }
};

const getDisbursementBalanceControllerWithKey = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const merchantId = req.params.merchantId;
  if (!merchantId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  try {
    const balance: any = await getDisbursementBalanceWithKey(merchantId);
    res.status(200).json(ApiResponse.success({ ...balance }));
  } catch (error) {
    next(error); // Pass the error to the error handling middleware
  }
};

const disburseTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Validate request data
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Return validation errors
    res
      .status(400)
      .json(ApiResponse.error(errors.array()[0] as unknown as string));
    return;
  }

  const merchantId = (req.user as JwtPayload)?.id;
  let { amount } = req.body;
  let rate = await getMerchantRate(prisma, merchantId);
  amount *= (1 - +rate);
  if (!merchantId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {

    // Get eligible transactions
    const transactions = await getEligibleTransactions(merchantId, prisma);
    if (transactions.length === 0) {
      throw new CustomError('No eligible transactions to disburse', 400);
    }

    let updates: TransactionUpdate[] = [];
    let totalDisbursed = new Decimal(0);

    if (amount) {
      const amountDecimal = new Decimal(amount);
      const result = calculateDisbursement(transactions, amountDecimal);
      updates = result.updates;
      totalDisbursed = result.totalDisbursed;
    } else {
      // Disburse all eligible transactions
      updates = transactions.map((t) => ({
        transaction_id: t.transaction_id,
        disbursed: true,
        balance: new Decimal(0),
        settled_amount: t.settled_amount,
        original_amount: t.original_amount
      }));
      totalDisbursed = transactions.reduce(
        (sum, t) => sum.plus(t.balance),
        new Decimal(0)
      );
    }

    // Update transactions to set disbursed: true or adjust balances
    await updateTransactions(updates, prisma);

    res.status(200).json(
      ApiResponse.success({
        message: "Transactions disbursed successfully",
        totalDisbursed: totalDisbursed.toString(),
        transactionsUpdated: updates,
      })
    );
  } catch (error) {
    if (error instanceof CustomError) {
      res.status(error.statusCode).json(ApiResponse.error(error.message));
      return;
    } else {
      console.error("Error disbursing transactions:", error);
      res.status(500).json(ApiResponse.error("Internal Server Error"));
      return;
    }
  }
};
export { getWalletBalanceController, getAllMerchantsWalletBalancesController,disburseTransactions, getWalletBalanceControllerWithKey, getDisbursementBalanceControllerWithKey };
