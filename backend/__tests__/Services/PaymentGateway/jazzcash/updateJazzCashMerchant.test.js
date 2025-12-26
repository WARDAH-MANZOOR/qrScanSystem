import jazzCashService from '../../../../dist/services/paymentGateway/jazzCash.js'; // Adjust the import path
import prisma from '../../../../dist/prisma/client.js'; // Adjust the import path for prisma client
import { CustomError } from '../../../../dist/utils/custom_error.js';

describe("updateJazzCashMerchant", () => {
    afterEach(() => {
        jest.clearAllMocks(); // Clear mock data after each test
    });

    it("should update JazzCash merchant data and return the updated merchant", async () => {
        const merchantId = 1;
        const updateData = { name: "Updated Merchant" };
        const mockUpdatedMerchant = { id: 1, name: "Updated Merchant", email: "test@example.com" };

        prisma.jazzCashMerchant = {
            update: jest.fn().mockResolvedValue(mockUpdatedMerchant),
        };
        prisma.$transaction = jest.fn((callback) => callback(prisma));

        const result = await jazzCashService.updateJazzCashMerchant(merchantId, updateData);

        expect(prisma.jazzCashMerchant.update).toHaveBeenCalledWith({
            where: { id: merchantId },
            data: updateData,
        });
        expect(result).toEqual(mockUpdatedMerchant);
    });

    it("should throw a CustomError if an error occurs during update", async () => {
        const merchantId = 1;
        const updateData = { name: "Updated Merchant" };

        const mockError = new Error("Database error");

        prisma.jazzCashMerchant = {
            update: jest.fn().mockRejectedValue(mockError),
        };
        prisma.$transaction = jest.fn((callback) => callback(prisma));

        await expect(jazzCashService.updateJazzCashMerchant(merchantId, updateData)).rejects.toThrow(CustomError);
        await expect(jazzCashService.updateJazzCashMerchant(merchantId, updateData)).rejects.toThrow("Database error");

        expect(prisma.jazzCashMerchant.update).toHaveBeenCalledWith({
            where: { id: merchantId },
            data: updateData,
        });
    });

    it("should throw a CustomError with a default message if an error occurs without a message", async () => {
        const merchantId = 1;
        const updateData = { name: "Updated Merchant" };

        const mockError = {};

        prisma.jazzCashMerchant = {
            update: jest.fn().mockRejectedValue(mockError),
        };
        prisma.$transaction = jest.fn((callback) => callback(prisma));

        await expect(jazzCashService.updateJazzCashMerchant(merchantId, updateData)).rejects.toThrow(CustomError);
        await expect(jazzCashService.updateJazzCashMerchant(merchantId, updateData)).rejects.toThrow("An error occurred");

        expect(prisma.jazzCashMerchant.update).toHaveBeenCalledWith({
            where: { id: merchantId },
            data: updateData,
        });
    });
});
