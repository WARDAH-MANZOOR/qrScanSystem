// src/controllers/paymentController.ts
import { Request, Response, NextFunction } from "express";
import { JwtPayload } from "jsonwebtoken";
import { jazzCashService } from "services/index.js";
import ApiResponse from "utils/ApiResponse.js";
import {
  getAllProfitsBalancesByMerchant,
  getAllTransactionsOfMerchant,
  getProfitAndBalance,
} from "@prisma/client/sql";
import prisma from "prisma/client.js";
import CustomError from "utils/custom_error.js";
import { getDateRange } from "utils/date_method.js";

import analytics from "./analytics.js";

const createTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const paymentData = req.body;
    let merchantId = (req.user as JwtPayload)?.id;
    const result = await jazzCashService.initiateJazzCashPayment(paymentData);
    return res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

const getTransactions = async (req: Request, res: Response) => {
  try {
    const { merchantId, transactionId, merchantName } = req.query;

    // Query based on provided parameters
    const transactions = await prisma.transaction.findMany({
      where: {
        ...(transactionId && { transaction_id: transactionId as string }),
        ...(merchantId && { merchant_id: parseInt(merchantId as string) }),
        ...(merchantName && {
          merchant: {
            username: merchantName as string,
          },
        }),
      },
    });

    res.status(200).json(transactions);
  } catch (err) {
    const error = new CustomError("Internal Server Error", 500);
    res.status(500).send(error);
  }
};

const getProAndBal = async (req: Request, res: Response) => {
  try {
    const { merchantId, startDate, endDate, range } = req.query;

    // Get date range based on the query parameters (defaulting to the full range if not provided)
    const { fromDate, toDate } = getDateRange(
      range as string,
      startDate as string,
      endDate as string
    );

    // Raw SQL query based on whether `merchantId` is provided or not
    const profitAndBalanceQuery = merchantId
      ? getAllProfitsBalancesByMerchant(
          fromDate,
          toDate,
          parseInt(merchantId as string)
        )
      : getProfitAndBalance(fromDate, toDate);

    const merchantsBalanceProfit = await prisma.$queryRawTyped(
      profitAndBalanceQuery
    );

    res.status(200).json(merchantsBalanceProfit);
  } catch (err) {
    console.log(err);
    const error = new CustomError("Internal Server Error", 500);
    res.status(500).send(error);
  }
};

export default {
  createTransaction,
  getTransactions,
  getProAndBal,
  ...analytics,
};
