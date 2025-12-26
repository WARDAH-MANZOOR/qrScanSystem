import prisma from '../../../../dist/prisma/client';
import { transactionCreateService } from '../../../../dist/services/index.js';
import { createTransaction } from '../../../../dist/services/transactions/create';
import CustomError from '../../../../dist/utils/custom_error';

jest.mock('../../../../dist/prisma/client', () => ({
    $transaction: jest.fn(),
}));

jest.mock('../../../../dist/services/index.js', () => ({
    transactionCreateService: {
        getMerchantCommission: jest.fn(),
        generateTransactionLink: jest.fn(),
        createTransactionRecord: jest.fn(),
        findOrCreateCustomer: jest.fn(),
    },
}));

jest.mock('../../../../dist/utils/custom_error');

beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    console.error.mockRestore();
});

describe('createTransaction', () => {


    test('should handle missing customer data', async () => {
        const mockObj = {
            order_id: '12345',
            id: 'txn_001',
            original_amount: '100.00',
            type: 'purchase',
            merchant_id: 'merchant_001',
        };

        prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
        transactionCreateService.findOrCreateCustomer.mockResolvedValue(null);

        await expect(createTransaction(mockObj)).rejects.toThrow('Internal Server Error');
    });

    test('should handle errors during transaction creation', async () => {
        const mockObj = {
            order_id: '12345',
            id: 'txn_001',
            original_amount: '100.00',
            type: 'purchase',
            merchant_id: 'merchant_001',
            customerName: 'John Doe',
            customerEmail: 'john@example.com',
        };

        prisma.$transaction.mockImplementation(async () => {
            throw new Error('Database error');
        });

        await expect(createTransaction(mockObj)).rejects.toThrow('Internal Server Error');
    });
    test('should handle errors during commission calculation', async () => {
        const mockObj = {
            order_id: '12345',
            id: 'txn_001',
            original_amount: '100.00',
            type: 'purchase',
            merchant_id: 'merchant_001',
        };

        prisma.$transaction.mockImplementation(async () => {
            throw new Error('Commission calculation error');
        });

        transactionCreateService.getMerchantCommission.mockRejectedValue(new Error('Commission calculation error'));

        await expect(createTransaction(mockObj)).rejects.toThrow('Internal Server Error');
    });
    test('should handle errors during transaction link generation', async () => {
        const mockObj = {
            order_id: '12345',
            id: 'txn_001',
            original_amount: '100.00',
            type: 'purchase',
            merchant_id: 'merchant_001',
            customerName: 'John Doe',
            customerEmail: 'john@example.com',
        };

        prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
        transactionCreateService.findOrCreateCustomer.mockResolvedValue({ id: 'customer_001' });
        transactionCreateService.createTransactionRecord.mockResolvedValue({ transaction_id: 'txn_001' });
        transactionCreateService.generateTransactionLink.mockRejectedValue(new Error('Link generation error'));

        await expect(createTransaction(mockObj)).rejects.toThrow('Internal Server Error');
    });
    

});
