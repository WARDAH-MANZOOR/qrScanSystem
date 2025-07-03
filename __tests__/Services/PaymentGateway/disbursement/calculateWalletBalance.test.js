import { Decimal } from "@prisma/client/runtime/library";
import prisma from "../../../../dist/prisma/client.js";
import { calculateWalletBalance } from "../../../../dist/services/paymentGateway/disbursement.js"; // Update with the actual path to your function

jest.mock("../../../../dist/prisma/client.js", () => ({
    transaction: {
        aggregate: jest.fn(),
    },
}));

describe("calculateWalletBalance", () => {
    const mockMerchantId = "merchant123";

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should return correct wallet and today's balance when transactions exist", async () => {
        const mockWalletBalance = new Decimal(150);
        const mockTodayBalance = new Decimal(50);

        prisma.transaction.aggregate
            .mockResolvedValueOnce({ _sum: { balance: mockWalletBalance } }) // Mock total wallet balance
            .mockResolvedValueOnce({ _sum: { balance: mockTodayBalance } }); // Mock today's balance

        const result = await calculateWalletBalance(mockMerchantId);

        expect(result).toEqual({
            walletBalance: mockWalletBalance.toNumber(),
            todayBalance: mockTodayBalance.toNumber(),
        });

        expect(prisma.transaction.aggregate).toHaveBeenNthCalledWith(1, {
            _sum: { balance: true },
            where: {
                settlement: true,
                balance: { gt: new Decimal(0) },
                merchant_id: mockMerchantId,
            },
        });

        const todayStart = new Date().setHours(0, 0, 0, 0);
        const todayEnd = new Date().setHours(23, 59, 59, 999);

        expect(prisma.transaction.aggregate).toHaveBeenNthCalledWith(2, {
            _sum: { balance: true },
            where: {
                settlement: true,
                balance: { gt: new Decimal(0) },
                merchant_id: mockMerchantId,
                date_time: {
                    gte: new Date(todayStart),
                    lt: new Date(todayEnd),
                },
            },
        });
    });

    it("should return zero balances when no transactions exist", async () => {
        prisma.transaction.aggregate
            .mockResolvedValueOnce({ _sum: { balance: null } }) // Mock total wallet balance
            .mockResolvedValueOnce({ _sum: { balance: null } }); // Mock today's balance

        const result = await calculateWalletBalance(mockMerchantId);

        expect(result).toEqual({
            walletBalance: 0,
            todayBalance: 0,
        });

        expect(prisma.transaction.aggregate).toHaveBeenNthCalledWith(1, {
            _sum: { balance: true },
            where: {
                settlement: true,
                balance: { gt: new Decimal(0) },
                merchant_id: mockMerchantId,
            },
        });

        const todayStart = new Date().setHours(0, 0, 0, 0);
        const todayEnd = new Date().setHours(23, 59, 59, 999);

        expect(prisma.transaction.aggregate).toHaveBeenNthCalledWith(2, {
            _sum: { balance: true },
            where: {
                settlement: true,
                balance: { gt: new Decimal(0) },
                merchant_id: mockMerchantId,
                date_time: {
                    gte: new Date(todayStart),
                    lt: new Date(todayEnd),
                },
            },
        });
    });
});
