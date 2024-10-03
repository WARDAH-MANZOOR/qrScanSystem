import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { subDays } from "date-fns";

const prisma = new PrismaClient();

// Helper function to get the start and end of today
const getTodayStartEnd = () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    return { todayStart, todayEnd };
};

// Method to fetch today's transaction count
const getTodayTransactionCount = async (merchantId: number): Promise<number> => {
    const { todayStart, todayEnd } = getTodayStartEnd();
    return prisma.transaction.count({
        where: {
            date_time: {
                gte: todayStart,
                lt: todayEnd,
            },
            merchant_id: merchantId,
        },
    });
};

// Method to fetch last 30 days transaction count
const getLast30DaysTransactionCount = async (merchantId: number): Promise<number> => {
    const currentDate = new Date();
    return prisma.transaction.count({
        where: {
            date_time: {
                gte: subDays(currentDate, 30),
            },
            merchant_id: merchantId,
        },
    });
};

// Method to fetch total transaction count
const getTotalTransactionCount = async (merchantId: number): Promise<number> => {
    return prisma.transaction.count({
        where: {
            merchant_id: merchantId,
        },
    });
};

// Method to fetch today's transaction sum
const getTodayTransactionSum = async (merchantId: number): Promise<number | Decimal> => {
    const { todayStart, todayEnd } = getTodayStartEnd();
    const result = await prisma.transaction.aggregate({
        _sum: { settled_amount: true },
        where: {
            date_time: {
                gte: todayStart,
                lt: todayEnd,
            },
            merchant_id: merchantId,
        },
    });
    return result._sum?.settled_amount || 0;
};

// Method to fetch current year's transaction sum
const getCurrentYearTransactionSum = async (merchantId: number): Promise<number | Decimal> => {
    const currentYearStart = new Date(new Date().getFullYear(), 0, 1);
    const nextYearStart = new Date(new Date().getFullYear() + 1, 0, 1);
    const result = await prisma.transaction.aggregate({
        _sum: { settled_amount: true },
        where: {
            date_time: {
                gte: currentYearStart,
                lt: nextYearStart,
            },
            merchant_id: merchantId,
        },
    });
    return result._sum?.settled_amount || 0;
};

// Method to fetch transaction status counts
const getTransactionStatusCounts = async (merchantId: number): Promise<{ status: string; _count: { status: number | Decimal } }[]> => {

    let data = await prisma.transaction.groupBy({
        where: {merchant_id: merchantId},
        by: ['status'],
        _count: { status: true },
        orderBy: {
            status: 'asc', // Ensure the result is ordered by status or any other field
        },
    })
    return data;
};

// Main controller method
const getDashboardSummary = async (merchantId: number) => {
    try {
        // Execute all queries in parallel
        const [
            todayCount,
            last30DaysCount,
            totalCount,
            todaySum,
            currentYearSum,
            statusCounts,
        ] = await Promise.all([
            getTodayTransactionCount(merchantId),
            getLast30DaysTransactionCount(merchantId),
            getTotalTransactionCount(merchantId),
            getTodayTransactionSum(merchantId),
            getCurrentYearTransactionSum(merchantId),
            getTransactionStatusCounts(merchantId),
        ]);

        // Build and return the full dashboard summary
        const dashboardSummary = {
            todayCount,
            last30DaysCount,
            totalCount,
            todaySum,
            currentYearSum,
            statusCounts: statusCounts || [],
        };

        return dashboardSummary;
    } catch (error) {
        console.error(error);
        throw error; // Re-throw the error to be handled by the caller
    }
};

// Export the controller function
export { getDashboardSummary };