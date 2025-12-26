import jazzCashService from '../../../../dist/services/paymentGateway/jazzCash.js'; // Adjust the import path
import prisma from '../../../../dist/prisma/client.js'; // Adjust the import path for prisma client
import { CustomError } from '../../../../dist/utils/custom_error.js';

describe("createJazzCashMerchant", () => {
    afterEach(() => {
        jest.clearAllMocks(); // Clear mock data after each test
    });

    it("should create a new JazzCash merchant and return its data", async () => {
        const merchantData = {
            name: "Test Merchant",
            email: "test@example.com",
            phone: "1234567890",
        };

        const mockCreatedMerchant = {
            id: 1,
            ...merchantData,
        };

        prisma.jazzCashMerchant = {
            create: jest.fn().mockResolvedValue(mockCreatedMerchant),
        };
        prisma.$transaction = jest.fn((callback) => callback(prisma));

        const result = await jazzCashService.createJazzCashMerchant(merchantData);

        expect(prisma.jazzCashMerchant.create).toHaveBeenCalledWith({
            data: merchantData,
        });
        expect(result).toEqual(mockCreatedMerchant);
    });

    it("should throw a CustomError if an error occurs", async () => {
        const merchantData = {
            name: "Test Merchant",
            email: "test@example.com",
            phone: "1234567890",
        };

        const mockError = new Error("Database error");

        prisma.jazzCashMerchant = {
            create: jest.fn().mockRejectedValue(mockError),
        };
        prisma.$transaction = jest.fn((callback) => callback(prisma));

        await expect(jazzCashService.createJazzCashMerchant(merchantData)).rejects.toThrow(CustomError);
        await expect(jazzCashService.createJazzCashMerchant(merchantData)).rejects.toThrow("Database error");

        expect(prisma.jazzCashMerchant.create).toHaveBeenCalledWith({
            data: merchantData,
        });
    });

    it("should throw a CustomError with a default message if the error does not contain a message", async () => {
        const merchantData = {
            name: "Test Merchant",
            email: "test@example.com",
            phone: "1234567890",
        };

        const mockError = {};

        prisma.jazzCashMerchant = {
            create: jest.fn().mockRejectedValue(mockError),
        };
        prisma.$transaction = jest.fn((callback) => callback(prisma));

        await expect(jazzCashService.createJazzCashMerchant(merchantData)).rejects.toThrow(CustomError);
        await expect(jazzCashService.createJazzCashMerchant(merchantData)).rejects.toThrow("An error occurred");

        expect(prisma.jazzCashMerchant.create).toHaveBeenCalledWith({
            data: merchantData,
        });
    });
});
