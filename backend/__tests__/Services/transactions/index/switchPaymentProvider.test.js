import { Decimal } from "@prisma/client/runtime/library";
import transactionsService from "../../../../dist/services/transactions/index.js"; // Replace with actual path
import prisma from "../../../../dist/prisma/client.js"; // Mock Prisma client

jest.mock('../../../../dist/prisma/client.js', () => ({
    transaction: {
        findUnique: jest.fn(),
        aggregate: jest.fn(),
    },
    merchant: {
        findUnique: jest.fn(),
        update: jest.fn(),
    },
}));

describe('switchPaymentProvider', () => {
    beforeEach(() => {
        jest.clearAllMocks(); // Reset mock state before each test
        jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
        jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.error
    });
    
      afterEach(() => {
        console.error.mockRestore(); // Restore console.error after tests
        jest.clearAllMocks();

      });

    test('should throw error if transaction is not found', async () => {
        prisma.transaction.findUnique.mockResolvedValue(null);
        await expect(transactionsService.switchPaymentProvider('merchant1', 'txn123')).rejects.toThrow('Merchant not found');
    });

    test('should throw error if merchant is not found', async () => {
        prisma.transaction.findUnique.mockResolvedValue({
            merchant: { id: 'merchant1' },
        });
        prisma.merchant.findUnique.mockResolvedValue(null);
        await expect(transactionsService.switchPaymentProvider('merchant1', 'txn123')).rejects.toThrow('Merchant not found');
    });

    test('should return direct if usage is below easypaisaLimit and payment method is DIRECT', async () => {
        prisma.transaction.findUnique.mockResolvedValue({
            merchant: { id: 'merchant1' },
        });
        prisma.merchant.findUnique.mockResolvedValue({
            merchant_id: 'merchant1',
            easypaisaLimit: new Decimal(1000),
            swichLimit: new Decimal(2000),
            easypaisaPaymentMethod: 'DIRECT',
            lastSwich: new Date(),
        });
        prisma.transaction.aggregate.mockResolvedValue({ _sum: { original_amount: 500 } });

        const result = await transactionsService.switchPaymentProvider('merchant1', 'txn123');
        expect(result).toBe('direct');
    });

    test('should switch to SWITCH if usage exceeds easypaisaLimit and payment method is DIRECT', async () => {
        prisma.transaction.findUnique.mockResolvedValue({
            merchant: { id: 'merchant1' },
        });
        prisma.merchant.findUnique.mockResolvedValue({
            merchant_id: 'merchant1',
            easypaisaLimit: new Decimal(1000),
            swichLimit: new Decimal(2000),
            easypaisaPaymentMethod: 'DIRECT',
            lastSwich: new Date(),
        });
        prisma.transaction.aggregate.mockResolvedValue({ _sum: { original_amount: 1500 } });

        prisma.merchant.update.mockResolvedValue({});

        const result = await transactionsService.switchPaymentProvider('merchant1', 'txn123');
        expect(result).toBe('switch');
        expect(prisma.merchant.update).toHaveBeenCalledWith({
            where: { merchant_id: 'merchant1' },
            data: { easypaisaPaymentMethod: 'SWITCH', lastSwich: expect.any(Date) },
        });
    });

    test('should switch to DIRECT if usage exceeds swichLimit and payment method is SWITCH', async () => {
        prisma.transaction.findUnique.mockResolvedValue({
            merchant: { id: 'merchant1' },
        });
        prisma.merchant.findUnique.mockResolvedValue({
            merchant_id: 'merchant1',
            easypaisaLimit: new Decimal(1000),
            swichLimit: new Decimal(2000),
            easypaisaPaymentMethod: 'SWITCH',
            lastSwich: new Date(),
        });
        prisma.transaction.aggregate.mockResolvedValue({ _sum: { original_amount: 2500 } });

        prisma.merchant.update.mockResolvedValue({});

        const result = await transactionsService.switchPaymentProvider('merchant1', 'txn123');
        expect(result).toBe('direct');
        expect(prisma.merchant.update).toHaveBeenCalledWith({
            where: { merchant_id: 'merchant1' },
            data: { easypaisaPaymentMethod: 'DIRECT', lastSwich: expect.any(Date) },
        });
    });
});
