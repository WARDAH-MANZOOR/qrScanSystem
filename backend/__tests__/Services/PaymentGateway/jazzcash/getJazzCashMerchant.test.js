import jazzCashService from '../../../../dist/services/paymentGateway/jazzCash.js'; // Adjust the import path
import prisma from '../../../../dist/prisma/client.js'; // Adjust the import path for prisma client
import { CustomError } from '../../../../dist/utils/custom_error.js';
describe("getJazzCashMerchant", () => {
    afterEach(() => {
        jest.clearAllMocks(); // Clear mock data after each test
    });

    it("should return JazzCash merchant configuration based on merchantId", async () => {
        const params = { merchantId: "1" };
        const mockMerchantConfig = [
            { merchantId: 1, name: "Test Merchant", email: "test@example.com" },
        ];

        prisma.jazzCashMerchant = {
            findMany: jest.fn().mockResolvedValue(mockMerchantConfig),
        };

        const result = await jazzCashService.getJazzCashMerchant(params);

        expect(prisma.jazzCashMerchant.findMany).toHaveBeenCalledWith({
            where: { merchantId: 1 },
        });
        expect(result).toEqual(mockMerchantConfig);
    });

    it("should return an empty array if no merchantId is provided", async () => {
        const params = {};
        const mockMerchantConfig = [];

        prisma.jazzCashMerchant = {
            findMany: jest.fn().mockResolvedValue(mockMerchantConfig),
        };

        const result = await jazzCashService.getJazzCashMerchant(params);

        expect(prisma.jazzCashMerchant.findMany).toHaveBeenCalledWith({
            where: {},
        });
        expect(result).toEqual(mockMerchantConfig);
    });

    it("should throw a CustomError if no configuration is found", async () => {
        const params = { merchantId: "1" };

        prisma.jazzCashMerchant = {
            findMany: jest.fn().mockResolvedValue(null),
        };

        await expect(jazzCashService.getJazzCashMerchant(params)).rejects.toThrow(CustomError);
        await expect(jazzCashService.getJazzCashMerchant(params)).rejects.toThrow(
            "JazzCash configuration not found"
        );

        expect(prisma.jazzCashMerchant.findMany).toHaveBeenCalledWith({
            where: { merchantId: 1 },
        });
    });

    it("should throw a CustomError with a default message if an error occurs", async () => {
        const params = { merchantId: "1" };

        const mockError = new Error("Database error");

        prisma.jazzCashMerchant = {
            findMany: jest.fn().mockRejectedValue(mockError),
        };

        await expect(jazzCashService.getJazzCashMerchant(params)).rejects.toThrow(CustomError);
        await expect(jazzCashService.getJazzCashMerchant(params)).rejects.toThrow("Database error");

        expect(prisma.jazzCashMerchant.findMany).toHaveBeenCalledWith({
            where: { merchantId: 1 },
        });
    });
});
