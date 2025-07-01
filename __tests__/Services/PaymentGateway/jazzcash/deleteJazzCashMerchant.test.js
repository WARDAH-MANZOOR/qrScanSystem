import jazzCashService from '../../../../dist/services/paymentGateway/jazzCash.js'; // Adjust the import path
import prisma from '../../../../dist/prisma/client.js'; // Adjust the import path for prisma client
import { CustomError } from '../../../../dist/utils/custom_error.js';

describe("deleteJazzCashMerchant", () => {
    afterEach(() => {
        jest.clearAllMocks(); // Clear mock data after each test
    });

    it("should delete a JazzCash merchant and return the deleted merchant", async () => {
        const merchantId = 1;
        const mockDeletedMerchant = { id: 1, name: "Deleted Merchant", email: "deleted@example.com" };

        prisma.jazzCashMerchant = {
            delete: jest.fn().mockResolvedValue(mockDeletedMerchant),
        };
        prisma.$transaction = jest.fn((callback) => callback(prisma));

        const result = await jazzCashService.deleteJazzCashMerchant(merchantId);

        expect(prisma.jazzCashMerchant.delete).toHaveBeenCalledWith({
            where: { id: merchantId },
        });
        expect(result).toEqual(mockDeletedMerchant);
    });

    it("should throw a CustomError if an error occurs during deletion", async () => {
        const merchantId = 1;

        const mockError = new Error("Database error");

        prisma.jazzCashMerchant = {
            delete: jest.fn().mockRejectedValue(mockError),
        };
        prisma.$transaction = jest.fn((callback) => callback(prisma));

        await expect(jazzCashService.deleteJazzCashMerchant(merchantId)).rejects.toThrow(CustomError);
        await expect(jazzCashService.deleteJazzCashMerchant(merchantId)).rejects.toThrow("Database error");

        expect(prisma.jazzCashMerchant.delete).toHaveBeenCalledWith({
            where: { id: merchantId },
        });
    });

    it("should throw a CustomError with a default message if an error occurs without a message", async () => {
        const merchantId = 1;

        const mockError = {};

        prisma.jazzCashMerchant = {
            delete: jest.fn().mockRejectedValue(mockError),
        };
        prisma.$transaction = jest.fn((callback) => callback(prisma));

        await expect(jazzCashService.deleteJazzCashMerchant(merchantId)).rejects.toThrow(CustomError);
        await expect(jazzCashService.deleteJazzCashMerchant(merchantId)).rejects.toThrow("An error occurred");

        expect(prisma.jazzCashMerchant.delete).toHaveBeenCalledWith({
            where: { id: merchantId },
        });
    });
});
