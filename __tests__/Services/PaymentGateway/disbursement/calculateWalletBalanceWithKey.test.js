import prisma from "../../../../dist/prisma/client.js";
import { Decimal } from "@prisma/client/runtime/library";
import {calculateWalletBalanceWithKey} from "../../../../dist/services/paymentGateway/disbursement.js";  // Adjust the import as needed
import CustomError from "../../../../dist/utils/custom_error.js";

// Mock prisma methods
jest.mock("../../../../dist/prisma/client.js", () => ({
    merchant: {
        findFirst: jest.fn(),
    },
    transaction: {
        aggregate: jest.fn(),
    },
}));

describe('calculateWalletBalanceWithKey', () => {
    beforeEach(() => {
        jest.clearAllMocks(); // Clear mocks before each test
    });

    it('should return correct wallet balance and today balance when merchant exists and has transactions', async () => {
        // Mock merchant found
        prisma.merchant.findFirst.mockResolvedValue({ merchant_id: 1 });

        // Mock result of transaction.aggregate (for overall wallet balance)
        prisma.transaction.aggregate.mockResolvedValueOnce({
            _sum: { balance: new Decimal(100) },
        });

        // Mock result of transaction.aggregate (for today’s balance)
        prisma.transaction.aggregate.mockResolvedValueOnce({
            _sum: { balance: new Decimal(50) },
        });

        const result = await calculateWalletBalanceWithKey('merchant123');
        
        expect(result).toEqual({
            walletBalance: 100,
            todayBalance: 50,
        });

        expect(prisma.merchant.findFirst).toHaveBeenCalledWith({
            where: { uid: 'merchant123' },
        });
        expect(prisma.transaction.aggregate).toHaveBeenCalledWith({
            _sum: { balance: true },
            where: {
                settlement: true,
                balance: { gt: new Decimal(0) },
                merchant_id: 1,
            },
        });
    });

    it('should return wallet balance of 0 and today balance of 0 when merchant exists but has no transactions', async () => {
        // Mock merchant found
        prisma.merchant.findFirst.mockResolvedValue({ merchant_id: 1 });

        // Mock result of transaction.aggregate (no transactions)
        prisma.transaction.aggregate.mockResolvedValueOnce({
            _sum: { balance: new Decimal(0) },
        });

        // Mock result of transaction.aggregate (no transactions for today)
        prisma.transaction.aggregate.mockResolvedValueOnce({
            _sum: { balance: new Decimal(0) },
        });

        const result = await calculateWalletBalanceWithKey('merchant123');
        
        expect(result).toEqual({
            walletBalance: 0,
            todayBalance: 0,
        });

        expect(prisma.merchant.findFirst).toHaveBeenCalledWith({
            where: { uid: 'merchant123' },
        });
        expect(prisma.transaction.aggregate).toHaveBeenCalledTimes(2);
    });
    
    it('should throw error gracefully if any Prisma query fails', async () => {
        // Mocking a merchant found
        prisma.merchant.findFirst.mockResolvedValue({ merchant_id: 1 });

        // Mock Prisma error for aggregate query
        prisma.transaction.aggregate.mockRejectedValue(new Error('Database error'));

        await expect(calculateWalletBalanceWithKey('merchant123'))
            .rejects
            .toThrowError(new CustomError('Database error', 500));

        expect(prisma.merchant.findFirst).toHaveBeenCalledWith({
            where: { uid: 'merchant123' },
        });
        expect(prisma.transaction.aggregate).toHaveBeenCalled();
    });

    it('should return wallet balance of 0 and today balance of 0 when no transactions exist for today', async () => {
        // Mock merchant found
        prisma.merchant.findFirst.mockResolvedValue({ merchant_id: 1 });

        // Mock result of transaction.aggregate (no transactions for today)
        prisma.transaction.aggregate.mockResolvedValueOnce({
            _sum: { balance: new Decimal(0) },
        });

        // Mock result of transaction.aggregate (no transactions for today)
        prisma.transaction.aggregate.mockResolvedValueOnce({
            _sum: { balance: new Decimal(0) },
        });

        const result = await calculateWalletBalanceWithKey('merchant123');
        
        expect(result).toEqual({
            walletBalance: 0,
            todayBalance: 0,
        });

        expect(prisma.merchant.findFirst).toHaveBeenCalledWith({
            where: { uid: 'merchant123' },
        });
    });
});
