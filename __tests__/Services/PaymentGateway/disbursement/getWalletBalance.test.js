import { Decimal } from "@prisma/client/runtime/library";
import prisma from "../../../../dist/prisma/client.js";
import CustomError from "../../../../dist/utils/custom_error.js";
import { getWalletBalance } from "../../../../dist/services/paymentGateway/disbursement.js"; // Update with the actual path to your function

jest.mock("../../../../dist/prisma/client.js", () => ({
    transaction: {
        aggregate: jest.fn(),
    },
    user: {
        findUnique: jest.fn(),
    },
}));

describe("getWalletBalance", () => {
    const originalConsoleError = console.error;
    const mockMerchantId = "merchant123";
    beforeEach(() => {
        console.error = jest.fn();
    });
    afterEach(() => {
        console.error = originalConsoleError;
        jest.clearAllMocks();
    });

    it("should return wallet and today's balance when merchant exists", async () => {
        // Mock checkMerchantExists to return true
        prisma.user.findUnique.mockResolvedValueOnce({ id: mockMerchantId });

        // Mock wallet balance aggregate result
        prisma.transaction.aggregate
            .mockResolvedValueOnce({ _sum: { balance: new Decimal(500) } }) // Wallet balance
            .mockResolvedValueOnce({ _sum: { balance: new Decimal(150) } }); // Today's balance

        const result = await getWalletBalance(mockMerchantId);

        expect(result).toEqual({ walletBalance: 500, todayBalance: 150 });
        expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: mockMerchantId } });
        expect(prisma.transaction.aggregate).toHaveBeenCalledTimes(2);
        expect(prisma.transaction.aggregate).toHaveBeenCalledWith({
            _sum: { balance: true },
            where: {
                settlement: true,
                balance: { gt: new Decimal(0) },
                merchant_id: mockMerchantId,
            },
        });
        expect(prisma.transaction.aggregate).toHaveBeenCalledWith({
            _sum: { balance: true },
            where: {
                settlement: true,
                balance: { gt: new Decimal(0) },
                merchant_id: mockMerchantId,
                date_time: {
                    gte: expect.any(Date),
                    lt: expect.any(Date),
                },
            },
        });
    });

    it("should throw an error when merchant does not exist", async () => {
        // Mock checkMerchantExists to return false
        prisma.user.findUnique.mockResolvedValueOnce(null);

        await expect(getWalletBalance(mockMerchantId)).rejects.toThrow(
            new CustomError("Merchant not found", 404)
        );

        expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: mockMerchantId } });
        expect(prisma.transaction.aggregate).not.toHaveBeenCalled();
    });

    it("should handle errors gracefully and throw a generic error", async () => {
        prisma.user.findUnique.mockResolvedValueOnce({ id: mockMerchantId });
        prisma.transaction.aggregate.mockRejectedValueOnce(new Error("Database error"));
    
        await expect(getWalletBalance(mockMerchantId)).rejects.toThrow(
            new CustomError("Unable to fetch wallet balance", 500)
        );
    
        expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: mockMerchantId } });
        expect(prisma.transaction.aggregate).toHaveBeenCalledTimes(1);
    });
    
});
