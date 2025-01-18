import { parseISO } from "date-fns";
import prisma from "../../../../dist/prisma/client.js";
import CustomError from "../../../../dist/utils/custom_error.js";
import analyticsService from '../../../../dist/services/transactions/analytics.js';
import { getTransactionsDaywise } from "@prisma/client/sql";

jest.mock("../../../../dist/prisma/client.js", () => ({
    $queryRawTyped: jest.fn(),
    transaction: {
        findMany: jest.fn(),
    },
}));

jest.mock("@prisma/client/sql", () => ({
    getTransactionsDaywise: jest.fn(),
}));

describe("filterTransactions", () => {
    it("should filter transactions by transactionId", async () => {
        const params = { transactionId: "txn123" };
        const user = { id: 1 };

        prisma.transaction.findMany.mockResolvedValue([]);

        const result = await analyticsService.filterTransactions(params, user);

        expect(prisma.transaction.findMany).toHaveBeenCalledWith({
            where: { merchant_id: 1, transaction_id: "txn123" },
            select: {
                date_time: true,
                settled_amount: true,
                status: true,
                response_message: true,
                transaction_id: true,
            },
        });
        expect(result).toEqual([]);
    });

    it("should filter transactions by date", async () => {
        const params = { date: "2025-01-01" };
        const user = { id: 1 };

        prisma.transaction.findMany.mockResolvedValue([]);

        const result = await analyticsService.filterTransactions(params, user);

        const parsedDate = parseISO(params.date);

        expect(prisma.transaction.findMany).toHaveBeenCalledWith({
            where: {
                merchant_id: 1,
                date_time: {
                    gte: parsedDate,
                    lte: parsedDate,
                },
            },
            select: {
                date_time: true,
                settled_amount: true,
                status: true,
                response_message: true,
                transaction_id: true,
            },
        });
        expect(result).toEqual([]);
    });

    it("should filter transactions by startDate and endDate", async () => {
        const params = { startDate: "2025-01-01", endDate: "2025-01-31" };
        const user = { id: 1 };

        prisma.transaction.findMany.mockResolvedValue([]);

        const result = await analyticsService.filterTransactions(params, user);

        const parsedStartDate = parseISO(params.startDate);
        const parsedEndDate = parseISO(params.endDate);

        expect(prisma.transaction.findMany).toHaveBeenCalledWith({
            where: {
                merchant_id: 1,
                date_time: {
                    gte: parsedStartDate,
                    lte: parsedEndDate,
                },
            },
            select: {
                date_time: true,
                settled_amount: true,
                status: true,
                response_message: true,
                transaction_id: true,
            },
        });
        expect(result).toEqual([]);
    });

    it("should filter transactions by status", async () => {
        const params = { status: "success" };
        const user = { id: 1 };

        prisma.transaction.findMany.mockResolvedValue([]);

        const result = await analyticsService.filterTransactions(params, user);

        expect(prisma.transaction.findMany).toHaveBeenCalledWith({
            where: {
                merchant_id: 1,
                status: "success",
            },
            select: {
                date_time: true,
                settled_amount: true,
                status: true,
                response_message: true,
                transaction_id: true,
            },
        });
        expect(result).toEqual([]);
    });

    it("should group transactions by day when groupByDay is true", async () => {
        const params = { groupByDay: "true" };
        const user = { id: 1 };

        const mockTransactions = [
            { date: "2025-01-01", totalAmount: 100 },
            { date: "2025-01-02", totalAmount: 200 },
        ];

        getTransactionsDaywise.mockResolvedValue(mockTransactions);
        prisma.$queryRawTyped.mockResolvedValue(mockTransactions);

        const result = await analyticsService.filterTransactions(params, user);

        expect(prisma.$queryRawTyped).toHaveBeenCalledWith(getTransactionsDaywise(user?.id));
        expect(result).toEqual(mockTransactions);
    });

   
    
});
