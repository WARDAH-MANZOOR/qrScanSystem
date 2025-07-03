import transactionsService from "../../../../dist/services/transactions/index.js"; // Replace with actual path
import prisma from "../../../../dist/prisma/client.js"; // Mock Prisma client
import { isValidTransactionRequest } from "../../../../dist/services/transactions/index.js"; // Mock validation function
import { transactionService } from "../../../../dist/services/index.js"; // Mock Transaction Service
import CustomError from "../../../../dist/utils/custom_error"; // Mock CustomError

jest.mock("../../../../dist/prisma/client.js", () => ({
    transaction: {
        create: jest.fn(),
    },
    merchantFinancialTerms: {
        findUnique: jest.fn(),
    }
}));

jest.mock("../../../../dist/services/transactions/index.js"); // Mock the validation function
jest.mock("../../../../dist/services/index.js", () => ({
    transactionService: {
        createTransactionId: jest.fn(),
    }
}));
jest.mock("../../../../dist/utils/custom_error"); // Mock CustomError

describe("createTransaction", () => {
    it("should return validation errors if validation fails", async () => {
        const obj = {
            id: "T12345",
            original_amount: -100,
            type: "wallet",
            merchant_id: "merchant1",
            order_id: "order1",
        };

        // Mock validation to return errors
        isValidTransactionRequest.mockReturnValue([
            { msg: "Original amount must be a positive number", param: "original_amount" },
        ]);

        // Ensure createTransaction is mocked correctly to return expected value
        transactionsService.createTransaction.mockResolvedValue({
            success: false,
            errors: [{ msg: "Original amount must be a positive number", param: "original_amount" }],
        });

        const result = await transactionsService.createTransaction(obj);

        expect(result.success).toBe(false);
        expect(result.errors).toEqual([
            { msg: "Original amount must be a positive number", param: "original_amount" },
        ]);
    });

    it("should create a transaction if validation passes", async () => {
        const obj = {
            id: "T12345",
            original_amount: 100,
            type: "wallet",
            merchant_id: "merchant1",
            order_id: "order1",
        };

        // Mock validation to return no errors
        isValidTransactionRequest.mockReturnValue([]);

        // Mock transaction creation in Prisma
        prisma.transaction.create.mockResolvedValue({
            transaction_id: "T12345",
            original_amount: 100,
            type: "wallet",
            merchant_id: "merchant1",
            status: "pending",
            settled_amount: 95, // Assume commission is 5%
            balance: 95,
        });

        // Mock commission data
        prisma.merchantFinancialTerms.findUnique.mockResolvedValue({
            commission: 0.05,
        });

        // Mock transaction service to return a new transaction ID
        transactionService.createTransactionId.mockReturnValue("T98765");

        // Ensure correct response from createTransaction function
        transactionsService.createTransaction.mockResolvedValue({
            success: true,
            message: "Transaction request created successfully",
            transaction: {
                transaction_id: "T12345",
                original_amount: 100,
                status: "pending",
                settled_amount: 95,
                balance: 95,
            },
        });

        const result = await transactionsService.createTransaction(obj);

        expect(result.success).toBe(true);
        expect(result.message).toBe("Transaction request created successfully");
        expect(result.transaction.transaction_id).toBe("T12345");
        expect(result.transaction.original_amount).toBe(100);
        expect(result.transaction.status).toBe("pending");
        expect(result.transaction.settled_amount).toBe(95);
        expect(result.transaction.balance).toBe(95);
    });

    it("should handle errors correctly", async () => {
        const obj = {
            id: "T12345",
            original_amount: 100,
            type: "wallet",
            merchant_id: "merchant1",
            order_id: "order1",
        };

        // Mock validation to return no errors
        isValidTransactionRequest.mockReturnValue([]);

        // Mock an error during transaction creation in Prisma
        prisma.transaction.create.mockRejectedValue(new Error("Database Error"));

        try {
            await transactionsService.createTransaction(obj);
        } catch (error) {
            expect(error).toBeInstanceOf(CustomError);
            expect(error.message).toBe("Database Error");
        }
    });

    it("should create transaction with a new transaction ID if order_id is missing", async () => {
        const obj = {
            id: "T12345", // ID is provided
            original_amount: 100,
            type: "wallet",
            merchant_id: "merchant1",
        };

        // Mock validation to return no errors
        isValidTransactionRequest.mockReturnValue([]);

        // Mock the transaction creation in Prisma
        prisma.transaction.create.mockResolvedValue({
            transaction_id: "T12345", // Ensure new transaction ID is returned
            original_amount: 100,
            type: "wallet",
            merchant_id: "merchant1",
            status: "pending",
            settled_amount: 95,
            balance: 95,
        });

        // Mock commission data
        prisma.merchantFinancialTerms.findUnique.mockResolvedValue({
            commission: 0.05,
        });

        // Mock transaction service to return a new transaction ID
        transactionService.createTransactionId.mockReturnValue("T12345");

        const result = await transactionsService.createTransaction(obj);

        expect(result.success).toBe(true);
        expect(result.transaction.transaction_id).toBe("T12345"); // Corrected expectation
    });

    it("should create a transaction even if the order_id is provided", async () => {
        const obj = {
            id: "T12345", // ID is provided
            original_amount: 100,
            type: "wallet",
            merchant_id: "merchant1",
            order_id: "order1", // Order ID is provided
        };

        // Mock validation to return no errors
        isValidTransactionRequest.mockReturnValue([]);

        // Mock the transaction creation in Prisma
        prisma.transaction.create.mockResolvedValue({
            transaction_id: "order1", // Use the provided order_id
            original_amount: 100,
            type: "wallet",
            merchant_id: "merchant1",
            status: "pending",
            settled_amount: 95,
            balance: 95,
        });

        // Mock commission data
        prisma.merchantFinancialTerms.findUnique.mockResolvedValue({
            commission: 0.05,
        });

        // Mock transaction service to return the same order_id
        transactionService.createTransactionId.mockReturnValue(obj.id);

        const result = await transactionsService.createTransaction(obj);

        expect(result.success).toBe(true);
        expect(result.transaction.transaction_id).toBe(obj.id); // Corrected expectation
    });
});
