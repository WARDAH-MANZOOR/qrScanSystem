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

const getSummary = async (req: Request, res: Response) => {
    const { type } = req.query;

    const currentDate = new Date();
    let result;

    try {
        switch (type) {
            case 'currentMonth':
                result = await prisma.transaction.findMany({
                    where: {
                        date_time: {
                            gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
                            lt: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
                        },
                        merchant_id: (req.user as JwtPayload)?.id
                    },
                    select: {
                        date_time: true,
                        settled_amount: true,
                        status: true,
                        transaction_id: true
                    }
                });
                break;

            case 'todayCount':
                result = await prisma.transaction.count({
                    where: {
                        date_time: {
                            gte: new Date(new Date().setHours(0, 0, 0, 0)),
                            lt: new Date(new Date().setHours(23, 59, 59, 999))
                        },
                        merchant_id: (req.user as JwtPayload)?.id
                    }
                });
                return res.json({ total_count: result });

            case 'last30Days':
                result = await prisma.transaction.count({
                    where: {
                        date_time: {
                            gte: subDays(currentDate, 30)
                        },
                        merchant_id: (req.user as JwtPayload)?.id
                    }
                });
                return res.json({ total_count: result });

            case 'totalCount':
                result = await prisma.transaction.count({
                    where: {
                        merchant_id: (req.user as JwtPayload)?.id
                    }
                });
                return res.json({ total_count: result });

            case 'todaySum':
                result = await prisma.transaction.aggregate({
                    _sum: { settled_amount: true },
                    where: {
                        date_time: {
                            gte: new Date(new Date().setHours(0, 0, 0, 0).toString()),
                            lt: new Date(new Date().setHours(23, 59, 59, 999).toString())
                        },
                        merchant_id: (req.user as JwtPayload)?.id
                    }
                });
                return res.json({ total_amount: result._sum?.settled_amount || 0 });

            case 'currentYearSum':
                result = await prisma.transaction.aggregate({
                    _sum: { settled_amount: true },
                    where: {
                        date_time: {
                            gte: new Date(new Date(currentDate.getFullYear(), 0, 1)),
                            lt: new Date(new Date(currentDate.getFullYear() + 1, 0, 1))
                        },
                        merchant_id: (req.user as JwtPayload)?.id
                    }
                });
                return res.json({ total_amount: result._sum?.settled_amount || 0 });

            default:
                return res.status(400).json(new CustomError("Invalid summary type", 400));
        }

        return res.json(result);
    } catch (error) {
        console.log(error)
        return res.status(500).json(new CustomError("Server Error", 500));
    }
};

const getTransactionStatusCount = async (req: Request, res: Response) => {
    const { status } = req.query;

    let filter: any = { merchant_id: (req.user as JwtPayload)?.id };

    if (status) filter.status = status;

    try {
        const statusCounts = await prisma.transaction.groupBy({
            where: filter,
            by: ['status'],
            _count: { status: true }
        });

        res.json(statusCounts);
    } catch (error) {
        return res.status(500).json(new CustomError("Server Error", 500));
    }
};


export { filterTransactions, getSummary, getTransactionStatusCount }