import { parse } from "date-fns";
import prisma from "prisma/client.js";
import { backofficeService } from "services/index.js";
import { getWalletBalance } from "services/paymentGateway/disbursement.js";
import CustomError from "utils/custom_error.js";

const createDisbursementRequest = async (requested_amount: number, merchant_id: number) => {
    try {
        return await prisma.disbursementRequest.create({
            data: {
                requestedAmount: requested_amount,
                merchantId: merchant_id,
                status: "pending"
            }
        });
    }
    catch (err: any) {
        throw new CustomError(err.message, 500);
    }
}

const updateDisbursementRequestStatus = async (requestId: number, status: string) => {
    try {
        const disbursementRequest = await prisma.disbursementRequest.update({
            where: { id: requestId },
            data: { status: status }
        });
        if (status == "approved") {
            const {walletBalance} = await getWalletBalance(disbursementRequest.merchantId) as {walletBalance: number};
            await prisma.merchant.update({
                where: { merchant_id: disbursementRequest.merchantId },
                data: { balanceToDisburse: {increment: Number(disbursementRequest.requestedAmount)} }
            });
            const updatedAvailableBalance = walletBalance - Number(disbursementRequest.requestedAmount);
            await backofficeService.adjustMerchantWalletBalance(disbursementRequest.merchantId, updatedAvailableBalance, false);
        }
        return {
            id: disbursementRequest.id,
            status: disbursementRequest.status
        }
    }
    catch (err: any) {
        throw new CustomError(err.message, 500);
    }
}

const getDisbursementRequests = async (params: any) => {
  try {
    const { merchantId } = params;

    let startDate = params.start as string;
    let endDate = params.end as string;
    const status = params.status as string;

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

      customWhere["createdAt"] = {
        gte: todayStart,
        lt: todayEnd,
      };
    }

    if (status) {
      customWhere["status"] = status;
    }

    let { page, limit } = params;
    // Query based on provided parameters
    let skip, take;
    if (page && limit) {
      skip = (+page > 0 ? parseInt(page as string) - 1 : parseInt(page as string)) * parseInt(limit as string);
      take = parseInt(limit as string);
    }
    const transactions = await prisma.disbursementRequest.findMany({
      ...(skip && { skip: +skip }),
      ...(take && { take: +take }),
      where: {
        ...(merchantId && { merchant_id: parseInt(merchantId as string) }),
        ...customWhere,
      },
      orderBy: {
        createdAt: "desc",
      }
    });

    let meta = {};
    if (page && take) {
      // Get the total count of transactions
      const total = await prisma.disbursementRequest.count(
        {
            where: {
                ...(merchantId && { merchant_id: parseInt(merchantId as string) }),
                ...customWhere,
              },
        }
      );
      // Calculate the total number of pages
      const pages = Math.ceil(total / +take);
      meta = {
        total,
        pages,
        page: parseInt(page as string),
        limit: take
      }
    }
    const response = {
      transactions: transactions.map((transaction) => ({
        ...transaction,
      })),
      meta,
    };

    return response;
  } catch (err) {
    console.log(err)
    const error = new CustomError("Internal Server Error", 500);
    return error;
  }
};

export default {
    createDisbursementRequest,
    updateDisbursementRequestStatus,
    getDisbursementRequests
}