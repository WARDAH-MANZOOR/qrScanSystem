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

    const reports = await prisma.settlementReport.findMany({
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
    return reports;
  } catch (error: any) {
    return error;
  }
};

export { getSettlement };
