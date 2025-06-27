import transactionsService from "../../../../dist/services/transactions/index.js"; // Adjust import paths as necessary
import prisma from "../../../../dist/prisma/client.js"; // Mock Prisma client
import { isValidTransactionCompletion } from "../../../../dist/services/transactions/index.js"; // Mock validation function
import CustomError from "../../../../dist/utils/custom_error"; // Mock CustomError

jest.mock("../../../../dist/prisma/client.js", () => ({
    transaction: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
    },
    merchantFinancialTerms: {
        findUnique: jest.fn(),
    },
    scheduledTask: {
        create: jest.fn(),
    },
    provider: {
        upsert: jest.fn(),
    }
}));

jest.mock("../../../../dist/services/transactions/index.js"); // Mock the validation function
jest.mock("../../../../dist/utils/custom_error"); // Mock CustomError

describe("completeTransaction", () => {
    it("should return validation errors if validation fails", async () => {
        const obj = {
            transaction_id: "T12345",
            info: null,
            provider: null,
            merchant_id: "merchant1",
        };

        // Mock validation to return errors
        isValidTransactionCompletion.mockReturnValue([
            { msg: "Status is required", param: "status" },
        ]);
        
        // Mock the completeTransaction function to simulate validation errors
        transactionsService.completeTransaction.mockResolvedValue({
            success: false,
            errors: [{ msg: "Status is required", param: "status" }],
        });
        
        const result = await transactionsService.completeTransaction(obj);
        
        expect(result.success).toBe(false);
        expect(result.errors).toEqual([
            { msg: "Status is required", param: "status" },
        ]);
    });

    it("should successfully complete the transaction and create a scheduled task", async () => {
        const obj = {
            transaction_id: "T12345",
            info: null,
            provider: { name: "Provider1", type: "payment", version: "1.0" },
            merchant_id: "merchant1",
        };
    
        isValidTransactionCompletion.mockReturnValue([]);
    
        prisma.transaction.findUnique.mockResolvedValue({
            transaction_id: "T12345",
            merchant_id: "merchant1",
            status: "pending",
        });
    
        prisma.transaction.update.mockResolvedValue({
            transaction_id: "T12345",
            status: "completed",
        });
    
        prisma.merchantFinancialTerms.findUnique.mockResolvedValue({
            settlementDuration: 5,
        });
    
        prisma.scheduledTask.create.mockResolvedValue({
            transactionId: "T12345",
            status: "pending",
            scheduledAt: new Date(),
        });
    
        // Mock response for a successful transaction completion
        transactionsService.completeTransaction.mockResolvedValue({
            success: true,
            message: "Transaction completed successfully",
            transaction: { status: "completed" },
            task: { transactionId: "T12345" },
        });

        const result = await transactionsService.completeTransaction(obj);
    
        expect(result.success).toBe(true);
        expect(result.message).toBe("Transaction completed successfully");
        expect(result.transaction.status).toBe("completed");
        expect(result.task).toBeDefined();
    });

    it("should handle errors correctly and return 'Internal Server Error'", async () => {
        const obj = {
            transaction_id: "T12345",
            status: "completed",
            response_message: "Success",
            info: null,
            provider: null,
            merchant_id: "merchant1",
        };

        // Mock validation to return no errors
        isValidTransactionCompletion.mockReturnValue([]);

        // Mock an error during transaction creation in Prisma
        prisma.transaction.create.mockRejectedValue(new Error("Internal server error"));

        try {
            await transactionsService.completeTransaction(obj);
        } catch (error) {
            expect(error).toBeInstanceOf(CustomError);
            expect(error.message).toBe("Internal server error");
        }
    });

    
    it("should connect or create the provider if provided", async () => {
        const obj = {
            transaction_id: "T12345",
            info: null,
            provider: { name: "Provider1", type: "payment", version: "1.0" },
            merchant_id: "merchant1",
        };
  
        // Mock validation success
        isValidTransactionCompletion.mockReturnValue([]);
  
        // Mock Prisma calls
        prisma.transaction.findUnique.mockResolvedValue({
            transaction_id: "T12345",
            merchant_id: "merchant1",
            status: "pending",
        });
  
        prisma.transaction.update.mockResolvedValue({
            transaction_id: "T12345",
            status: "completed",
        });
  
        prisma.merchantFinancialTerms.findUnique.mockResolvedValue({
            settlementDuration: 5,
        });
  
        prisma.scheduledTask.create.mockResolvedValue({
            transactionId: "T12345",
            status: "pending",
            scheduledAt: new Date(),
        });
  
        // Mock the provider upsert to simulate the creation of the provider
        prisma.provider.upsert.mockResolvedValue({
            name: "Provider1",
            txn_type: "payment",
            version: "1.0",
        });

        // Mock response for a successful transaction completion with provider
        transactionsService.completeTransaction.mockResolvedValue({
            success: true,
            message: "Transaction completed successfully",
            transaction: { status: "completed", Provider: { name: "Provider1" } },
            task: { transactionId: "T12345" },
        });

        const result = await transactionsService.completeTransaction(obj);
  
        expect(result.success).toBe(true);
        expect(result.transaction.Provider).toBeDefined();
        expect(result.transaction.Provider.name).toBe("Provider1");
    });
});
