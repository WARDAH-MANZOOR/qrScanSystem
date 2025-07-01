import transactionsCreateService from "../../../../dist/services/transactions/create.js"; // Adjust the import path based on your project structure
import prisma from "../../../../dist/prisma/client.js"; // Adjust path as needed
import { toZonedTime } from "date-fns-tz"; // If necessary to mock timezone
import transactionService from "../../../../dist/services/transactions/index.js"; // Adjust path as needed

jest.mock("../../../../dist/prisma/client.js", () => ({
    transaction: {
        create: jest.fn(),
    },
}));

jest.mock("../../../../dist/services/transactions/index.js", () => ({
    createTransactionId: jest.fn(),
}));

describe("createTransactionRecord", () => {
    const mockPrisma = prisma;
    const mockTransactionService = transactionService;
    const mockTransactionData = {
        order_id: "txn123",
        id: 1,
        originalAmount: 1000,
        type: "wallet",
        merchantId: 1,
        settledAmount: 900,
        customerId: 1,
    };

    it("should return undefined if transaction type is invalid", async () => {
        const invalidData = { ...mockTransactionData, type: "invalid" };

        const result = await transactionsCreateService.createTransactionRecord(invalidData, mockPrisma);

        expect(result).toBeUndefined(); // Should return undefined as the type is invalid
        expect(mockPrisma.transaction.create).not.toHaveBeenCalled();
    });

    it("should call prisma.transaction.create with correct data when valid data is provided", async () => {
        const validData = { ...mockTransactionData, type: "wallet" };

        mockTransactionService.createTransactionId.mockReturnValue("txn123"); // Mock transaction ID creation
        const date = new Date();
        const timeZone = "Asia/Karachi";
        const zonedDate = toZonedTime(date, timeZone);

        await transactionsCreateService.createTransactionRecord(validData, mockPrisma);

        expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
            data: {
                transaction_id: "txn123", // Mocked value
                // Check if the date is close to the current time
                date_time: expect.any(Date), // This allows the test to pass as long as a valid date is used
                original_amount: 1000,
                status: "pending",
                type: "wallet",
                settled_amount: 900,
                balance: 900,
                merchant: {
                    connect: { id: 1 },
                },
                customer: {
                    connect: { id: 1 },
                },
            },
        });
    });

    it("should handle missing customer or merchant id gracefully", async () => {
        const invalidData = { ...mockTransactionData, customerId: undefined };

        try {
            await transactionsCreateService.createTransactionRecord(invalidData, mockPrisma);
        } catch (error) {
            expect(error).toBeDefined();
            expect(error.message).toBe("Some appropriate error message if customerId is missing");
        }
    });

    it("should return transaction object if successful", async () => {
        const validData = { ...mockTransactionData, type: "wallet" };

        mockTransactionService.createTransactionId.mockReturnValue("txn123");
        const date = new Date();
        const timeZone = "Asia/Karachi";
        const zonedDate = toZonedTime(date, timeZone);

        const mockTransaction = {
            id: 1,
            transaction_id: "txn123",
            date_time: zonedDate,
            original_amount: 1000,
            status: "pending",
            type: "wallet",
            settled_amount: 900,
            balance: 900,
            merchantId: 1,
            customerId: 1,
        };

        mockPrisma.transaction.create.mockResolvedValue(mockTransaction);

        const result = await transactionsCreateService.createTransactionRecord(validData, mockPrisma);

        expect(result).toEqual(mockTransaction);
    });
});
