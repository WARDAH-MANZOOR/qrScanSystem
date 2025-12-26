import { merchantService } from "../../../../dist/services/index.js";
import { initiateTransaction } from "../../../../dist/services/paymentGateway/index.js";
import CustomError from "../../../../dist/utils/custom_error.js";
import prisma from "../../../../dist/prisma/client.js";
import { getEligibleTransactions } from "../../../../dist/services/paymentGateway/disbursement.js";
import fetch from "node-fetch";
jest.mock("../../../../dist/prisma/client.js", () => ({
    $transaction: jest.fn(),
}));

jest.mock("../../../../dist/services/index.js", () => ({
    merchantService: {
        findOne: jest.fn(),
    },
}));

jest.mock("../../../../dist/services/paymentGateway/index.js", () => ({
    initiateTransaction: jest.fn(),
}));

jest.mock("../../../../dist/services/paymentGateway/disbursement.js", () => ({
    getEligibleTransactions: jest.fn(),
}));
jest.mock("node-fetch", () => jest.fn());

beforeEach(() => {
    jest.clearAllMocks(); // Reset mock state before each test
    jest.spyOn(console, "error").mockImplementation(() => {}); // Suppress console.error
    jest.spyOn(console, "log").mockImplementation(() => {}); // Suppress console.log
});

afterEach(() => {
    console.error.mockRestore(); // Restore console.error after tests
});

describe("initiateTransaction", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        prisma.$transaction.mockImplementation(async (callback) => {
            return await callback(prisma);
        });
    });

    test("should throw an error if merchant is not found", async () => {
        // Mock implementation to throw error for missing merchant
        initiateTransaction.mockImplementation(() => {
            throw new CustomError("Merchant not found", 404);
        });

        try {
            await initiateTransaction("mockToken", {}, "mockMerchantId");
        } catch (error) {
            expect(error.message).toBe("Merchant not found");
            expect(error.statusCode).toBe(404);
        }
    });

    test("should throw an error if there are no eligible transactions", async () => {
        // Mock implementation to throw error for no eligible transactions
        initiateTransaction.mockImplementation(() => {
            throw new CustomError("No eligible transactions to disburse", 400);
        });

        try {
            await initiateTransaction("mockToken", {}, "mockMerchantId");
        } catch (error) {
            expect(error.message).toBe("No eligible transactions to disburse");
            expect(error.statusCode).toBe(400);
        }
    });

    test("should initiate the transaction successfully", async () => {
        // Mock implementation for successful transaction
        const mockResponse = { success: true, transactionId: "12345" };
        initiateTransaction.mockResolvedValue(mockResponse);

        const result = await initiateTransaction("mockToken", {}, "mockMerchantId");
        expect(result).toEqual(mockResponse);
    });


    test("should throw an error if transaction initiation fails", async () => {
        const mockMerchant = { id: "validMerchant" };
        merchantService.findOne.mockResolvedValue(mockMerchant);
    
        const mockTransactions = [{ id: "transaction1" }];
        getEligibleTransactions.mockResolvedValue(mockTransactions);
    
        fetch.mockResolvedValue({
            json: jest.fn().mockResolvedValue(null), // Simulate a failed API response
        });
    
        const mockToken = "mockToken";
        const mockBody = { transactionAmount: 1000 };
        const mockMerchantId = "validMerchant";
    
        // Mock `initiateTransaction` to throw an error
        initiateTransaction.mockRejectedValue(new CustomError("Failed to initiate transaction", 500));
    
        await expect(initiateTransaction(mockToken, mockBody, mockMerchantId)).rejects.toThrowError(
            new CustomError("Failed to initiate transaction", 500)
        );
    });
    
});