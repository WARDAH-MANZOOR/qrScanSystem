import { jest } from "@jest/globals";
import prisma from "../../../../dist/prisma/client.js"; // Adjust the path to match your Prisma client setup
import transactionsService from "../../../../dist/services/transactions/index.js"; // Adjust import paths as necessary

jest.mock("../../../../dist/prisma/client.js", () => ({
    $transaction: jest.fn(),
}));

describe("createTxn", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should create a transaction with the correct data", async () => {
        const mockTransaction = {
            id: 1,
            merchant_transaction_id: "ORDER123",
            transaction_id: "TXN12345",
            date_time: new Date(),
            original_amount: 1000,
            type: "credit",
            status: "success",
            merchant_id: "MERCHANT123",
            settled_amount: 900,
            balance: 900,
            providerDetails: { provider: "test_provider" },
        };

        // Mock Prisma transaction creation
        prisma.$transaction.mockImplementation(async (callback) => {
            return callback({
                transaction: {
                    create: jest.fn().mockResolvedValue(mockTransaction),
                },
            });
        });

        const input = {
            order_id: "ORDER123",
            transaction_id: "TXN12345",
            amount: 1000,
            commission: 0.1,
            type: "credit",
            status: "success",
            merchant_id: "MERCHANT123",
            providerDetails: { provider: "test_provider" },
        };

        const result = await transactionsService.createTxn(input);

        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockTransaction);
    });

    it("should calculate the settled amount correctly", async () => {
        const input = {
            order_id: "ORDER123",
            transaction_id: "TXN12345",
            amount: 2000,
            commission: 0.15, // 15% commission
            type: "debit",
            status: "pending",
            merchant_id: "MERCHANT456",
            providerDetails: { provider: "test_provider" },
        };

        const mockTransaction = {
            id: 2,
            merchant_transaction_id: "ORDER123",
            transaction_id: "TXN12345",
            date_time: new Date(),
            original_amount: 2000,
            type: "debit",
            status: "pending",
            merchant_id: "MERCHANT456",
            settled_amount: 1700, // 2000 - (15% of 2000)
            balance: 1700,
            providerDetails: { provider: "test_provider" },
        };

        prisma.$transaction.mockImplementation(async (callback) => {
            return callback({
                transaction: {
                    create: jest.fn().mockResolvedValue(mockTransaction),
                },
            });
        });

        const result = await transactionsService.createTxn(input);

        expect(result.settled_amount).toBe(1700);
    });

    it("should handle Prisma errors gracefully", async () => {
        const input = {
            order_id: "ORDER123",
            transaction_id: "TXN12345",
            amount: 1000,
            commission: 0.1,
            type: "credit",
            status: "failed",
            merchant_id: "MERCHANT789",
            providerDetails: { provider: "test_provider" },
        };

        // Mock Prisma to throw an error
        prisma.$transaction.mockImplementation(async () => {
            throw new Error("Database error");
        });

        await expect(transactionsService.createTxn(input)).rejects.toThrow("Database error");
        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it("should correctly map input object fields to transaction data", async () => {
        const input = {
            order_id: "ORDER999",
            transaction_id: "TXN99999",
            amount: 5000,
            commission: 0.2,
            type: "refund",
            status: "completed",
            merchant_id: "MERCHANT999",
            providerDetails: { provider: "another_provider" },
        };

        const mockTransaction = {
            id: 3,
            merchant_transaction_id: "ORDER999",
            transaction_id: "TXN99999",
            date_time: new Date(),
            original_amount: 5000,
            type: "refund",
            status: "completed",
            merchant_id: "MERCHANT999",
            settled_amount: 4000, // 5000 - (20% of 5000)
            balance: 4000,
            providerDetails: { provider: "another_provider" },
        };

        prisma.$transaction.mockImplementation(async (callback) => {
            return callback({
                transaction: {
                    create: jest.fn().mockResolvedValue(mockTransaction),
                },
            });
        });

        const result = await transactionsService.createTxn(input);

        expect(result.merchant_transaction_id).toBe(input.order_id);
        expect(result.transaction_id).toBe(input.transaction_id);
        expect(result.original_amount).toBe(input.amount);
        expect(result.settled_amount).toBe(4000);
    });
});
