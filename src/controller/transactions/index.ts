// src/controllers/paymentController.ts
import { Request, Response, NextFunction } from "express";
import { JwtPayload } from "jsonwebtoken";
import { jazzCashService } from "services/index.js";
import ApiResponse from "../../utils/ApiResponse.js";
import {
  getAllProfitsBalancesByMerchant,
  getProfitAndBalance,
} from "@prisma/client/sql";
import prisma from "../../prisma/client.js";
import CustomError from "../../utils/custom_error.js";
import { getDateRange } from "../../utils/date_method.js";
import { parse } from "date-fns";

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
    const { merchantId, transactionId, merchantName, merchantTransactionId } = req.query;

    let startDate = req.query?.start as string;
    let endDate = req.query?.end as string;
    const status = req.query?.status as string;
    const search = req.query?.search || "" as string;
    const msisdn = req.query?.msisdn || "" as string;

    const customWhere = {} as any;

    if (startDate && endDate) {
      startDate = startDate.replace(" ", "+");
      endDate = endDate.replace(" ", "+");

      const todayStart = parse(
        startDate,
        "yyyy-MM-dd'T'HH:mm:ssXXX",
        new Date()
      );
      const todayEnd = parse(endDate, "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());

      customWhere["date_time"] = {
        gte: todayStart,
        lt: todayEnd,
      };
    }

    if (status) {
      customWhere["status"] = status;
    }

    if (search) {
      customWhere["transaction_id"] = {
        contains: search,
      };
    }

    if (msisdn) {
      customWhere["providerDetails"] = {
        path: ['msisdn'],
        equals: msisdn
      }
    }

    if (merchantTransactionId) {
      customWhere["merchant_transaction_id"] = { contains: merchantTransactionId };
    }
    const transactions = await prisma.transaction.findMany({
      
      where: {
        ...(transactionId && { transaction_id: transactionId as string }),
        ...(merchantId && { merchant_id: parseInt(merchantId as string) }),
        ...(merchantName && {
          merchant: {
            username: merchantName as string,
          },
        }),
        ...customWhere,
      },
      orderBy: {
        date_time: "desc",
      },
      include: {
        merchant: {
          include: {
            groups: {
              include: {
                merchant: {
                  include: {
                    jazzCashMerchant: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    let meta = {};
    

    res.status(200).json(transactions.map(transaction => ({...transaction, jazzCashMerchant: transaction.merchant.groups[0].merchant?.jazzCashMerchant})));
  } catch (err) {
    console.log(err)
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

// let { page, limit } = req.query;
//     // Query based on provided parameters
//     let skip, take;
//     if (page && limit) {
//       skip = (+page > 0 ? parseInt(page as string) - 1: parseInt(page as string)) * parseInt(limit as string);
//       take = parseInt(limit as string);
//     }
// ...(skip && { skip: +skip }),
//       ...(take && { take: +take }),
// if (page && take) {
//   // Get the total count of transactions
//   const total = await prisma.transaction.count();

//   // Calculate the total number of pages
//   const pages = Math.ceil(total / +take);
//   meta = {
//     total,
//     pages,
//     page: parseInt(page as string),
//     limit: take
//   }
// }
// const response = {
//   transactions: transactions.map((transaction) => ({
//     ...transaction,
//     jazzCashMerchant: transaction.merchant.groups[0]?.merchant?.jazzCashMerchant,
//   })),
//   meta,
// };