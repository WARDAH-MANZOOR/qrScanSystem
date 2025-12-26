import transactionController from '../../../../dist/controller/transactions/index.js';
import prisma from '../../../../dist/prisma/client.js';
import { Parser } from 'json2csv';
import CustomError from '../../../../dist/utils/custom_error.js';

jest.mock('../../../../dist/prisma/client.js', () => ({
    transaction: {
        findMany: jest.fn(),
    },
}));

jest.mock('../../../../dist/utils/custom_error.js', () => jest.fn().mockImplementation((message, statusCode) => ({
    message,
    statusCode,
})));

describe('exportTransactions', () => {
    const mockReq = {
        query: {
            merchantId: '123',
            transactionId: 'T123456',
            merchantName: 'Merchant1',
            start: '2024-01-01T00:00:00+00:00',
            end: '2024-01-02T00:00:00+00:00',
            status: 'completed',
            search: 'T123',
            msisdn: '1234567890',
            merchantTransactionId: 'M123456',
        },
    };
    const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
        header: jest.fn(),
        attachment: jest.fn(),
    };
    const mockNext = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should export transactions in CSV format based on query parameters', async () => {
        const mockTransactions = [
            {
                transaction_id: 'T123456',
                providerDetails: { msisdn: '1234567890', name: 'JazzCash' },
                merchant_transaction_id: 'M123456',
                date_time: new Date(),
                original_amount: 1000,
                settled_amount: 950,
                response_message: 'Success',
                status: 'completed',
                type: 'purchase',
            },
        ];

        prisma.transaction.findMany.mockResolvedValue(mockTransactions);

        await transactionController.exportTransactions(mockReq, mockRes);

        expect(prisma.transaction.findMany).toHaveBeenCalledWith({
            where: {
                transaction_id: 'T123456',
                merchant_id: 123,
                merchant: { username: 'Merchant1' },
                date_time: {
                    gte: expect.any(Date),
                    lt: expect.any(Date),
                },
                status: 'completed',
                transaction_id: { contains: 'T123' },
                providerDetails: { path: ['msisdn'], equals: '1234567890' },
                merchant_transaction_id: { contains: 'M123456' },
            },
            orderBy: { date_time: 'desc' },
        });

        expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
        expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="transactions.csv"');
        expect(mockRes.send).toHaveBeenCalledWith(expect.stringContaining('T123456'));
    });

    
    it('should return CSV with total settled amount', async () => {
        const mockTransactions = [
            {
                transaction_id: 'T123456',
                providerDetails: { msisdn: '1234567890', name: 'JazzCash' },
                merchant_transaction_id: 'M123456',
                date_time: new Date(),
                original_amount: 1000,
                settled_amount: 950,
                response_message: 'Success',
                status: 'completed',
                type: 'purchase',
            },
            {
                transaction_id: 'T789012',
                providerDetails: { msisdn: '9876543210', name: 'JazzCash' },
                merchant_transaction_id: 'M789012',
                date_time: new Date(),
                original_amount: 1500,
                settled_amount: 1450,
                response_message: 'Success',
                status: 'completed',
                type: 'purchase',
            },
        ];

        prisma.transaction.findMany.mockResolvedValue(mockTransactions);

        await transactionController.exportTransactions(mockReq, mockRes);

        const expectedCsv = expect.stringContaining('T123456');
        const expectedTotalSettledAmount = expect.stringContaining('Total Settled Amount,,2400');

        expect(mockRes.send).toHaveBeenCalledWith(expectedCsv);
        expect(mockRes.send).toHaveBeenCalledWith(expectedTotalSettledAmount);
    });

    it('should handle missing query parameters and return all transactions', async () => {
        const mockReqWithoutParams = { query: {} };

        const mockTransactions = [
            {
                transaction_id: 'T123456',
                providerDetails: { msisdn: '1234567890', name: 'JazzCash' },
                merchant_transaction_id: 'M123456',
                date_time: new Date(),
                original_amount: 1000,
                settled_amount: 950,
                response_message: 'Success',
                status: 'completed',
                type: 'purchase',
            },
        ];

        prisma.transaction.findMany.mockResolvedValue(mockTransactions);

        await transactionController.exportTransactions(mockReqWithoutParams, mockRes);

        expect(prisma.transaction.findMany).toHaveBeenCalledWith({
            where: {},
            orderBy: { date_time: 'desc' },
        });

        expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
        expect(mockRes.send).toHaveBeenCalledWith(expect.stringContaining('T123456'));
    });

    it('should correctly handle date format conversion in start and end date parameters', async () => {
        const mockTransactions = [
            {
                transaction_id: 'T123456',
                providerDetails: { msisdn: '1234567890', name: 'JazzCash' },
                merchant_transaction_id: 'M123456',
                date_time: new Date(),
                original_amount: 1000,
                settled_amount: 950,
                response_message: 'Success',
                status: 'completed',
                type: 'purchase',
            },
        ];

        const mockReqWithDate = {
            query: {
                start: '2024-01-01T00:00:00+00:00',
                end: '2024-01-02T00:00:00+00:00',
            },
        };

        prisma.transaction.findMany.mockResolvedValue(mockTransactions);

        await transactionController.exportTransactions(mockReqWithDate, mockRes);

        expect(prisma.transaction.findMany).toHaveBeenCalledWith({
            where: {
                date_time: {
                    gte: expect.any(Date),
                    lt: expect.any(Date),
                },
            },
            orderBy: { date_time: 'desc' },
        });
    });
});
