import { parseISO, subDays } from "date-fns";
import prisma from "prisma/client.js";
import CustomError from "utils/custom_error.js";

const merchantDashboardDetails = async (params: any, user: any) => {
  try {
    const merchantId = params?.merchantId;

    if (!merchantId) {
      throw new CustomError("Merchant ID is required", 400);
    }

    const currentDate = new Date();
    let filters: { merchant_id: number } = { merchant_id: merchantId };

    try {
      const todayStart = new Date().setHours(0, 0, 0, 0);
      const todayEnd = new Date().setHours(23, 59, 59, 999);

      const fetchAggregates = [];

      // Fetch today's transaction count
      fetchAggregates.push(
        prisma.transaction.count({
          where: {
            date_time: {
              gte: new Date(todayStart),
              lt: new Date(todayEnd),
            },
            merchant_id: +merchantId,
          },
        }) // Return type is a Promise<number>
      );

      // Fetch last 30 days transaction count
      fetchAggregates.push(
        prisma.transaction.count({
          where: {
            date_time: {
              gte: subDays(currentDate, 30),
            },
            merchant_id: +merchantId,
          },
        }) // Return type is a Promise<number>
      );

      // Fetch total transaction count
      fetchAggregates.push(
        prisma.transaction.count({
          where: {
            merchant_id: +merchantId,
          },
        }) // Return type is a Promise<number>
      );

      // Fetch today's transaction sum
      fetchAggregates.push(
        prisma.transaction.aggregate({
          _sum: { settled_amount: true },
          where: {
            date_time: {
              gte: new Date(todayStart),
              lt: new Date(todayEnd),
            },
            merchant_id: +merchantId,
          },
        }) as Promise<{ _sum: { settled_amount: number | null } }> // Properly type the aggregate query
      );

      // Fetch current year's transaction sum
      fetchAggregates.push(
        prisma.transaction.aggregate({
          _sum: { settled_amount: true },
          where: {
            date_time: {
              gte: new Date(currentDate.getFullYear(), 0, 1),
              lt: new Date(currentDate.getFullYear() + 1, 0, 1),
            },
            merchant_id: +merchantId,
          },
        }) as Promise<{ _sum: { settled_amount: number | null } }> // Properly type the aggregate query
      );

      // Fetch transaction status count
      fetchAggregates.push(
        prisma.transaction.groupBy({
          where: { merchant_id: +merchantId },
          by: ["status"],
          _count: { status: true },
          orderBy: {
            status: "asc", // Ensure the result is ordered by status or any other field
          },
        }) // Properly type the groupBy query
      );

      // Execute all queries in parallel
      const [
        todayCount,
        last30DaysCount,
        totalCount,
        todaySum,
        currentYearSum,
        statusCounts,
      ] = await Promise.all(fetchAggregates);

      // Build and return the full dashboard summary
      const dashboardSummary = {
        todayCount: todayCount as number, // Ensure correct type
        last30DaysCount: last30DaysCount as number, // Ensure correct type
        totalCount: totalCount as number, // Ensure correct type
        todaySum:
          (todaySum as { _sum: { settled_amount: number | null } })._sum
            ?.settled_amount || 0,
        currentYearSum:
          (currentYearSum as { _sum: { settled_amount: number | null } })._sum
            ?.settled_amount || 0,
        statusCounts: statusCounts || [],
      };

      return dashboardSummary;
    } catch (error) {
      console.error(error);
      return error;
    }
  } catch (error: any) {
    throw new CustomError(error?.error, error?.statusCode);
  }
};

const adminDashboardDetails = async (params: any) => {
  try {
    const currentDate = new Date();
    const todayStart = params.start;
    const todayEnd = params.end;

    const fetchAggregates = [];

    // Fetch total number of merchants
    fetchAggregates.push(
      prisma.merchant.count() // Return type is a Promise<number>
    );

    // Fetch sum of original_amount from transactions
    fetchAggregates.push(
      prisma.transaction.aggregate({
        _sum: { original_amount: true },
        where: {
          status: "completed",
        },
      }) as Promise<{ _sum: { original_amount: number | null } }> // Properly type the aggregate query
    );

    // Fetch sum of original_amount from today's transactions
    fetchAggregates.push(
      prisma.transaction.aggregate({
        _sum: { original_amount: true },
        where: {
          status: "completed",
          date_time: {
            gte: new Date(todayStart),
            lt: new Date(todayEnd),
          },
        },
      }) as Promise<{ _sum: { original_amount: number | null } }> // Properly type the aggregate query
    );

    // bring latest 5 transactions
    fetchAggregates.push(
      prisma.transaction.findMany({
        take: 5,
        orderBy: {
          date_time: "desc",
        },
      }) // Properly type the findMany
    );

    // Execute all queries in parallel
    const [
      totalMerchants,
      totalOriginalAmount,
      todayOriginalAmount,
      latestTransactions,
    ] = await Promise.all(fetchAggregates);

    // Build and return the full dashboard summary
    const dashboardSummary = {
      totalMerchants: totalMerchants as number, // Ensure correct type
      totalOriginalAmount:
        (totalOriginalAmount as { _sum: { original_amount: number | null } })
          ._sum?.original_amount || 0,
      todayOriginalAmount:
        (todayOriginalAmount as { _sum: { original_amount: number | null } })
          ._sum?.original_amount || 0,
      latestTransactions: latestTransactions as any,
    };

    return dashboardSummary;
  } catch (error) {
    console.error(error);
    return error;
  }
};

export default {
  merchantDashboardDetails,
  adminDashboardDetails,
};
