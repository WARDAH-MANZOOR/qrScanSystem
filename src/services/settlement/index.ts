import { parse } from "date-fns";
import { JwtPayload } from "jsonwebtoken";
import prisma from "../../prisma/client.js";
import CustomError from "../../utils/custom_error.js";

const getSettlement = async (params: any, user: JwtPayload) => {
  const merchantId = user?.merchant_id || params.merchant_id;

  if (!merchantId && user?.role !== "Admin") {
    throw new CustomError("Merchant ID is required", 400);
  }

  let filters: { merchant_id?: number } = {};

  if (merchantId) {
    filters["merchant_id"] = +merchantId;
  }

  try {
    const startDate = params?.start?.replace(" ", "+");
    const endDate = params?.end?.replace(" ", "+");

    const customWhere = {} as any;

    if (startDate && endDate) {
      const todayStart = parse(
        startDate,
        "yyyy-MM-dd'T'HH:mm:ssXXX",
        new Date()
      );
      const todayEnd = parse(endDate, "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());

      customWhere["settlementDate"] = {
        gte: todayStart,
        lt: todayEnd,
      };
    }

    let { page, limit } = params;
    // Query based on provided parameters
    let skip, take;
    if (page && limit) {
      skip = (+page > 0 ? parseInt(page as string) - 1: parseInt(page as string)) * parseInt(limit as string);
      take = parseInt(limit as string);
    }
    const reports = await prisma.settlementReport.findMany({
      ...(skip && { skip: +skip }),
      ...(take && { take: +take }),
      where: {
        ...filters,
        ...customWhere,
      },
      include: {
        merchant: {
          select: {
            uid: true,
            full_name: true,
          },
        },
      }
    });
    let meta = {};
    if (page && take) {
      // Get the total count of transactions
      const total = await prisma.transaction.count();

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
      transactions: reports.map((transaction) => ({
        ...transaction,
        jazzCashMerchant: transaction.merchant,
      })),
      meta,
    };

    return response;
  } catch (error: any) {
    return error;
  }
};

export { getSettlement };
