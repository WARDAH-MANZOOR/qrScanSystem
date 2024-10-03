import { getTransactionsDaywise } from "@prisma/client/sql";
import { parseISO, subDays } from "date-fns";
import { Request, Response } from "express";
import { JwtPayload } from "jsonwebtoken";
import prisma from "prisma/client.js";
import CustomError from "utils/custom_error.js";

const filterTransactions = async (params: any, user: any) => {
  const { transactionId, date, startDate, endDate, status, groupByDay } =
    params;

  let filter: any = { merchant_id: user?.id };

  if (transactionId) filter.transaction_id = transactionId as string;
  if (date)
    filter.date_time = {
      gte: parseISO(date as string),
      lte: parseISO(date as string),
    };
  if (startDate && endDate)
    filter.date_time = {
      gte: parseISO(startDate as string),
      lte: parseISO(endDate as string),
    };
  if (status) filter.status = status as string;

  try {
    if (groupByDay === "true") {
      // Group by day
      const transactions = await prisma.$queryRawTyped(
        getTransactionsDaywise(user?.id)
      );
      return transactions;
    }

    const transactions = await prisma.transaction.findMany({
      where: filter,
      select: {
        date_time: true,
        settled_amount: true,
        status: true,
        response_message: true,
        transaction_id: true,
      },
    });

    return transactions;
  } catch (error: any) {
    throw new CustomError(error?.error, error?.statusCode);
  }
};

const getDashboardSummary = async (params: any) => {
  const merchantId = params?.merchant_id;

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
};

export default { filterTransactions, getDashboardSummary };
