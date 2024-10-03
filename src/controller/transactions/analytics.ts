import { getTransactionsDaywise } from "@prisma/client/sql";
import { parseISO, subDays } from "date-fns";
import { Request, Response } from "express";
import { JwtPayload } from "jsonwebtoken";
import prisma from "prisma/client.js";
import CustomError from "utils/custom_error.js";

const filterTransactions = async (req: Request, res: Response) => {
    const { transactionId, date, startDate, endDate, status, groupByDay } = req.query;

    let filter: any = { merchant_id: (req.user as JwtPayload)?.id };

    if (transactionId) filter.transaction_id = transactionId as string;
    if (date) filter.date_time = { gte: parseISO(date as string), lte: parseISO(date as string) };
    if (startDate && endDate) filter.date_time = { gte: parseISO(startDate as string), lte: parseISO(endDate as string) };
    if (status) filter.status = status as string;

    try {
        if (groupByDay === 'true') {
            // Group by day
            const transactions = await prisma.$queryRawTyped(getTransactionsDaywise((req.user as JwtPayload)?.id));
            return res.status(200).json(transactions);
        }

        const transactions = await prisma.transaction.findMany({
            where: filter,
            select: {
                date_time: true,
                settled_amount: true,
                status: true,
                response_message: true,
                transaction_id: true
            }
        });

        res.status(200).json(transactions);
    } catch (error) {
        return res.status(500).json(new CustomError("Internal Server Error", 500));
    }
};

export { filterTransactions }