import prisma from "../../../../dist/prisma/client.js";
import CustomError from "../../../../dist/utils/custom_error.js";
import analyticsService from '../../../../dist/services/transactions/analytics.js';

jest.mock("../../../../dist/prisma/client.js", () => ({
    transaction: {
        findMany: jest.fn(),
    },
}));

describe("getCustomerTransactions", () => {
    it("should return transactions for a valid customer id", async () => {
        const params = { id: 1 };
        const mockTransactions = [
            { transaction_id: "txn123", amount: 100 },
            { transaction_id: "txn124", amount: 200 },
        ];

        prisma.transaction.findMany.mockResolvedValue(mockTransactions);

        const result = await analyticsService.getCustomerTransactions(params);

        expect(prisma.transaction.findMany).toHaveBeenCalledWith({
            where: {
                customer_id: 1,
            },
        });
        expect(result).toEqual(mockTransactions);
    });

    it("should throw a CustomError when there is a database error", async () => {
        const params = { id: 1 };
        const mockError = new Error("Database error");
        prisma.transaction.findMany.mockRejectedValue(mockError);

        try {
            await analyticsService.getCustomerTransactions(params);
        } catch (error) {
            expect(error).toBeInstanceOf(CustomError);
            expect(error.message).toBe("Internal Server Error");
            expect(error.statusCode).toBe(500);
        }
    });
});
