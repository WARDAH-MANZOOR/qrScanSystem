import prisma from "../../../dist/prisma/client.js";
import CustomError from "../../../dist/utils/custom_error.js";
import backofficeService from "../../../dist/services/backoffice/backoffice.js";

jest.mock("../../../dist/prisma/client.js", () => ({
    scheduledTask: { deleteMany: jest.fn() },
    settlementReport: { deleteMany: jest.fn() },
    disbursement: { deleteMany: jest.fn() },
    transaction: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
    },
}));

describe("removeMerchantFinanceData", () => {
    const merchantId = "test-merchant-id";

    it("should remove merchant finance data successfully", async () => {
        const mockTransactions = [
            { transaction_id: 1 },
            { transaction_id: 2 },
        ];
    
        prisma.transaction.findMany.mockResolvedValue(mockTransactions);
        prisma.scheduledTask.deleteMany.mockResolvedValue({ count: 2 });
        prisma.settlementReport.deleteMany.mockResolvedValue({ count: 1 });
        prisma.disbursement.deleteMany.mockResolvedValue({ count: 1 });
        prisma.transaction.deleteMany.mockResolvedValue({ count: 2 });
    
        console.log("Mock Transactions:", await prisma.transaction.findMany()); // Debugging Output
    
        await expect(backofficeService.removeMerchantFinanceData(merchantId)).resolves.toBe(
            "Merchant finance data removed successfully."
        );
    });
    

    it("should throw a CustomError when transaction.findMany fails", async () => {
        prisma.transaction.findMany.mockRejectedValue(new Error("Database error"));

        await expect(backofficeService.removeMerchantFinanceData(merchantId)).rejects.toThrow(
            new CustomError("Error removing merchant finance data", 500)
        );
    });

    it("should throw a CustomError when scheduledTask.deleteMany fails", async () => {
        prisma.transaction.findMany.mockResolvedValue([{ transaction_id: 1 }]);
        prisma.scheduledTask.deleteMany.mockRejectedValue(new Error("Database error"));

        await expect(backofficeService.removeMerchantFinanceData(merchantId)).rejects.toThrow(
            new CustomError("Error removing merchant finance data", 500)
        );
    });

    it("should throw a CustomError when settlementReport.deleteMany fails", async () => {
        prisma.transaction.findMany.mockResolvedValue([{ transaction_id: 1 }]);
        prisma.scheduledTask.deleteMany.mockResolvedValue({ count: 1 });
        prisma.settlementReport.deleteMany.mockRejectedValue(new Error("Database error"));

        await expect(backofficeService.removeMerchantFinanceData(merchantId)).rejects.toThrow(
            new CustomError("Error removing merchant finance data", 500)
        );
    });

    it("should throw a CustomError when disbursement.deleteMany fails", async () => {
        prisma.transaction.findMany.mockResolvedValue([{ transaction_id: 1 }]);
        prisma.scheduledTask.deleteMany.mockResolvedValue({ count: 1 });
        prisma.settlementReport.deleteMany.mockResolvedValue({ count: 1 });
        prisma.disbursement.deleteMany.mockRejectedValue(new Error("Database error"));

        await expect(backofficeService.removeMerchantFinanceData(merchantId)).rejects.toThrow(
            new CustomError("Error removing merchant finance data", 500)
        );
    });

    it("should throw a CustomError when transaction.deleteMany fails", async () => {
        prisma.transaction.findMany.mockResolvedValue([{ transaction_id: 1 }]);
        prisma.scheduledTask.deleteMany.mockResolvedValue({ count: 1 });
        prisma.settlementReport.deleteMany.mockResolvedValue({ count: 1 });
        prisma.disbursement.deleteMany.mockResolvedValue({ count: 1 });
        prisma.transaction.deleteMany.mockRejectedValue(new Error("Database error"));

        await expect(backofficeService.removeMerchantFinanceData(merchantId)).rejects.toThrow(
            new CustomError("Error removing merchant finance data", 500)
        );
    });
});
