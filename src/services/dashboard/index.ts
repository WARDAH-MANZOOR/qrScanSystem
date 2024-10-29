import { parseISO, subDays, parse } from "date-fns";
import prisma from "prisma/client.js";
import CustomError from "utils/custom_error.js";
import { getWalletBalance } from "services/paymentGateway/disbursement.js";

const merchantDashboardDetails = async (params: any, user: any) => {
  try {
    const merchantId = params?.merchantId;

    if (!merchantId) {
      throw new CustomError("Merchant ID is required", 400);
    }

    const currentDate = new Date();
    let filters: { merchant_id: number } = { merchant_id: merchantId };

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

        customWhere["date_time"] = {
          gte: todayStart,
          lt: todayEnd,
        };
      }

      const fetchAggregates = [];

      // Fetch total transaction count
      fetchAggregates.push(
        prisma.transaction.count({
          where: {
            merchant_id: +merchantId,
            status: "completed",
            ...customWhere,
          },
        }) // Return type is a Promise<number>
      );

      // fetch sum of original amount from transactions
      fetchAggregates.push(
        prisma.transaction
          .aggregate({
            _sum: { original_amount: true },
            where: {
              status: "completed",
              merchant_id: +merchantId,
              ...customWhere,
            },
          })
          .catch((error: any) => {
            throw new CustomError(error?.message, 500);
          }) as Promise<{ _sum: { original_amount: number | null } }> // Properly type the aggregate query
      );
      // // Fetch today's transaction sum
      const servertodayStart = new Date().setHours(0, 0, 0, 0);
      const servertodayEnd = new Date().setHours(23, 59, 59, 999);

      fetchAggregates.push(
        prisma.transaction.aggregate({
          _sum: { original_amount: true },
          where: {
            date_time: {
              gte: new Date(servertodayStart),
              lt: new Date(servertodayEnd),
            },
            merchant_id: +merchantId,
            status: "completed"
          },
        }) as Promise<{ _sum: { original_amount: number | null } }> // Properly type the aggregate query
      );

      // Fetch transaction status count
      fetchAggregates.push(
        prisma.transaction.groupBy({
          where: { merchant_id: +merchantId, ...customWhere },
          by: ["status"],
          _count: { status: true },
          orderBy: {
            status: "asc", // Ensure the result is ordered by status or any other field
          },
        }) // Properly type the groupBy query
      );

      fetchAggregates.push(
        prisma.transaction.findMany({
          take: 10,
          orderBy: {
            date_time: "desc",
          },
          where: {
            merchant_id: +merchantId,
            ...customWhere,
          },
        })
      );

      // count transaction of this week and last week
      const lastWeekStart = subDays(currentDate, 7);
      const lastWeekEnd = new Date(currentDate.setHours(0, 0, 0, 0)); // End of last week is start of today
      const thisWeekStart = new Date(currentDate.setHours(0, 0, 0, 0)); // Start of this week is start of today
      const thisWeekEnd = new Date();

      // Fetch last week's transaction sum
      fetchAggregates.push(
        prisma.transaction.aggregate({
          _sum: { original_amount: true },
          where: {
            date_time: {
              gte: lastWeekStart,
              lt: lastWeekEnd,
            },
            merchant_id: +merchantId,
            status: "completed"
          },
        }) as Promise<{ _sum: { original_amount: number | null } }> // Properly type the aggregate query
      );

      // Fetch this week's transaction sum
      fetchAggregates.push(
        prisma.transaction.aggregate({
          _sum: { original_amount: true },
          where: {
            date_time: {
              gte: thisWeekStart,
              lt: thisWeekEnd,
            },
            merchant_id: +merchantId,
            status: "completed"
          },
        }) as Promise<{ _sum: { original_amount: number | null } }> // Properly type the aggregate query
      );

      // Execute all queries in parallel
      const [
        totalTransactions,
        totalIncome,
        todayIncome,
        statusCounts,
        latestTransactions,
        lastWeek,
        thisWeek,
      ] = await Promise.all(fetchAggregates);

      // Build and return the full dashboard summary
      const dashboardSummary = {
        totalTransactions: totalTransactions as number, // Ensure correct type
        totalIncome:
          (totalIncome as { _sum: { original_amount: number | null } })._sum
            ?.original_amount || 0,
        todayIncome:
          (todayIncome as { _sum: { original_amount: number | null } })._sum
            ?.original_amount || 0,
        statusCounts: (statusCounts as any[]) || [],
        latestTransactions: latestTransactions as any,
        availableBalance: 0,
        transactionSuccessRate: 0,
        lastWeek:
          (lastWeek as { _sum: { original_amount: number | null } })._sum
            ?.original_amount || 0,
        thisWeek:
          (thisWeek as { _sum: { original_amount: number | null } })._sum
            ?.original_amount || 0,
      };

      const walletBalance = await getWalletBalance(+merchantId);

      // @ts-ignore
      dashboardSummary.availableBalance = walletBalance?.walletBalance || 0;

      // Calculate the transaction success rate
      dashboardSummary.transactionSuccessRate =
        await getTransactionsSuccessRate(statusCounts);

      // make sure we sending three status always in response completed, failed, pending
      const statusTypes = ["completed", "pending", "failed"];
      // @ts-ignore
      const statusCountsMap = statusCounts.reduce((acc: any, item: any) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {});

      dashboardSummary.statusCounts = statusTypes.map((status) => ({
        status,
        count: statusCountsMap[status] || 0,
      }));

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

      customWhere["date_time"] = {
        gte: todayStart,
        lt: todayEnd,
      };
    }

    const fetchAggregates = [];

    // Fetch total number of merchants
    fetchAggregates.push(prisma.merchant.count());

    // Fetch sum of original_amount from transactions
    fetchAggregates.push(
      prisma.transaction.aggregate({
        _sum: { original_amount: true },
        where: {
          status: "completed",
          ...customWhere,
        },
      }) as Promise<{ _sum: { original_amount: number | null } }> // Properly type the aggregate query
    );

    const servertodayStart = new Date().setHours(0, 0, 0, 0);
    const servertodayEnd = new Date().setHours(23, 59, 59, 999);

    // Fetch sum of original_amount from today's transactions
    fetchAggregates.push(
      prisma.transaction
        .aggregate({
          _sum: { original_amount: true },
          where: {
            date_time: {
              gte: new Date(servertodayStart),
              lte: new Date(servertodayEnd),
            },
            status: "completed",
          },
        })
        .catch((error: any) => {
          throw new CustomError(error?.message, 500);
        }) as Promise<{ _sum: { original_amount: number | null } }> // Properly type the aggregate query
    );

    // bring latest 10 transactions
    fetchAggregates.push(
      prisma.transaction.findMany({
        take: 10,
        orderBy: {
          date_time: "desc",
        },
        where: {
          ...customWhere,
        },
        include: {
          Provider: true
        }
      })
    );
    // Execute all queries in parallel
    const [totalMerchants, totalIncome, todayIncome, latestTransactions] =
      await Promise.all(fetchAggregates);

    // Build and return the full dashboard summary
    const dashboardSummary = {
      totalMerchants: totalMerchants as number, // Ensure correct type
      totalIncome:
        (totalIncome as { _sum: { original_amount: number | null } })._sum
          ?.original_amount || 0,
      todayIncome:
        (todayIncome as { _sum: { original_amount: number | null } })._sum
          ?.original_amount || 0,
      latestTransactions: latestTransactions as any,
    };

    return dashboardSummary;
  } catch (error: any) {
    throw new CustomError(error?.error, error?.statusCode);
  }
};

const getTransactionsSuccessRate = async (statusCounts: any) => {
  // On Basis of statusCounts generate a transaction success rate
  // 1. Find the total number of transactions
  const totalTransactions = statusCounts.reduce(
    (acc: number, item: any) => acc + item._count.status,
    0
  );

  // 2. Find the number of successful transactions
  const successfulTransactions = statusCounts.find(
    (item: any) => item.status === "completed"
  )?._count.status;

  // 3. Calculate the success rate

  return totalTransactions
    ? ((successfulTransactions || 0) / totalTransactions) * 100
    : 0;
};

export default {
  merchantDashboardDetails,
  adminDashboardDetails,
};
