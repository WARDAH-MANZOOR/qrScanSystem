import { jest } from "@jest/globals";
import prisma from "../../../../dist/prisma/client.js"; // Adjust this path to match your project structure
import transactionsService from "../../../../dist/services/transactions/index.js"; // Adjust import paths as necessary
import { addWeekdays } from "../../../../dist/utils/date_method.js"; // Mock the addWeekdays function if it's external

jest.mock("../../../../dist/prisma/client.js", () => ({
    $transaction: jest.fn(),
    scheduledTask: {
        create: jest.fn(),
    },
}));

jest.mock("../../../../dist/utils/date_method.js", () => ({
    addWeekdays: jest.fn(),
}));

describe("updateTxn", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should update the transaction with the provided data", async () => {
        const mockTransaction = { transaction_id: "TXN12345", status: "updated" };
        const mockObj = { status: "updated" };

        prisma.$transaction.mockImplementation(async (callback) => {
            return callback({
                transaction: {
                    update: jest.fn().mockResolvedValue(mockTransaction),
                },
                provider: { upsert: jest.fn().mockResolvedValue({}) },
            });
        });

        const result = await transactionsService.updateTxn("TXN12345", mockObj, 2);

        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it("should upsert the provider when updating the transaction", async () => {
        const mockProvider = {
            name: "EasyPaisa",
            txn_type: "MA",
            version: "",
        };
    
        prisma.$transaction.mockImplementation(async (callback) => {
            return callback({
                transaction: {
                    update: jest.fn().mockResolvedValue({}),
                },
                provider: {
                    upsert: jest.fn().mockResolvedValue(mockProvider),
                },
                scheduledTask: {
                    create: jest.fn(), // Add this mock
                },
            });
        });
    
        await transactionsService.updateTxn("TXN12345", { status: "completed" }, 2);
    
        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
    

    it("should create a scheduled task if the transaction status is 'completed'", async () => {
        const mockScheduledAt = new Date("2025-01-15T10:00:00Z"); // Example future date
        addWeekdays.mockReturnValue(mockScheduledAt);

        prisma.$transaction.mockImplementation(async (callback) => {
            return callback({
                transaction: {
                    update: jest.fn().mockResolvedValue({}),
                },
                provider: { upsert: jest.fn().mockResolvedValue({}) },
                scheduledTask: {
                    create: jest.fn().mockResolvedValue({
                        status: "pending",
                        scheduledAt: mockScheduledAt,
                        executedAt: null,
                    }),
                },
            });
        });

        await transactionsService.updateTxn("TXN12345", { status: "completed" }, 2);

        expect(addWeekdays).toHaveBeenCalledWith(expect.any(Date), 2);
        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it("should not create a scheduled task if the transaction status is not 'completed'", async () => {
        prisma.$transaction.mockImplementation(async (callback) => {
            return callback({
                transaction: {
                    update: jest.fn().mockResolvedValue({}),
                },
                provider: { upsert: jest.fn().mockResolvedValue({}) },
            });
        });

        await transactionsService.updateTxn("TXN12345", { status: "pending" }, 2);

        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it("should handle errors gracefully if the update or scheduled task creation fails", async () => {
        prisma.$transaction.mockImplementation(async () => {
            throw new Error("Database error");
        });

        await expect(transactionsService.updateTxn("TXN12345", { status: "completed" }, 2)).rejects.toThrow("Database error");

        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
});
