import { getTransactionsDaywise } from "@prisma/client/sql";
import { parseISO } from "date-fns";
import prisma from "../../prisma/client.js";
import CustomError from "../../utils/custom_error.js";
const filterTransactions = async (params, user) => {
    const { transactionId, date, startDate, endDate, status, groupByDay } = params;
    let filter = { merchant_id: user?.id };
    if (transactionId)
        filter.transaction_id = transactionId;
    if (date)
        filter.date_time = {
            gte: parseISO(date),
            lte: parseISO(date),
        };
    if (startDate && endDate)
        filter.date_time = {
            gte: parseISO(startDate),
            lte: parseISO(endDate),
        };
    if (status)
        filter.status = status;
    try {
        if (groupByDay === "true") {
            // Group by day
            const transactions = await prisma.$queryRawTyped(getTransactionsDaywise(user?.id));
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
    }
    catch (error) {
        throw new CustomError(error?.error, error?.statusCode);
    }
};
const getDashboardSummary = async (params) => {
};
const getCustomerTransactions = async (params) => {
    try {
        console.log(params.id);
        const transactions = await prisma.transaction.findMany({
            where: {
                customer_id: params.id,
            }
        });
        return transactions;
    }
    catch (err) {
        throw new CustomError("Internal Server Error", 500);
    }
};
export default { filterTransactions, getDashboardSummary, getCustomerTransactions };
