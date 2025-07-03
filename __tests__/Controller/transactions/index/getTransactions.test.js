import transactionController from '../../../../dist/controller/transactions/index.js';
import prisma from '../../../../dist/prisma/client.js';
import CustomError from '../../../../dist/utils/custom_error.js';

jest.mock('../../../../dist/prisma/client.js', () => {
    return {
        transaction: {
            findMany: jest.fn(),
        },
    };
});
jest.mock("../../../../dist/utils/custom_error.js", () => {
    return jest.fn().mockImplementation((message, statusCode) => ({
        message,
        statusCode,
    }));
});

describe('getTransactions', () => {
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
        },
    };

    const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return transactions based on query parameters', async () => {
        const mockTransactions = [
            {
                transaction_id: 'T123456',
                date_time: new Date(),
                status: 'completed',
                providerDetails: { msisdn: '1234567890' },
                merchant: {
                    username: 'Merchant1',
                    groups: [
                        {
                            merchant: {
                                jazzCashMerchant: true,
                            },
                        },
                    ],
                },
            },
        ];
    
        prisma.transaction.findMany.mockResolvedValue(mockTransactions);
    
        await transactionController.getTransactions(mockReq, mockRes);
    
        expect(prisma.transaction.findMany).toHaveBeenCalledWith({
            where: {
                transaction_id: 'T123456',
                merchant_id: 123,
                merchant: {
                    username: 'Merchant1',
                },
                date_time: { gte: expect.any(Date), lt: expect.any(Date) },
                status: 'completed',
                transaction_id: { contains: 'T123' },
                providerDetails: { path: ['msisdn'], equals: '1234567890' },
            },
            orderBy: { date_time: 'desc' },
            include: {
                merchant: {
                    include: {
                        groups: {
                            include: {
                                merchant: {
                                    include: {
                                        jazzCashMerchant: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
    
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
            transactions: [
                {
                    transaction_id: 'T123456',
                    date_time: expect.any(Date),
                    status: 'completed',
                    providerDetails: { msisdn: '1234567890' },
                    merchant: {
                        username: 'Merchant1',
                        groups: [
                            {
                                merchant: {
                                    jazzCashMerchant: true,
                                },
                            },
                        ],
                    },
                    jazzCashMerchant: true,
                },
            ],
            meta: {},
        });
    });
    
    it('should return 500 and error message if an error occurs', async () => {
        const error = new Error("Internal Server Error");

        prisma.transaction.findMany.mockRejectedValue(error);

        const mockReq = { query: {} };

        jest.spyOn(console, 'log').mockImplementation(() => {});

        await transactionController.getTransactions(mockReq, mockRes);

        expect(console.log).toHaveBeenCalledWith(error);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.send).toHaveBeenCalledWith({ message: 'Internal Server Error', statusCode: 500 });

        console.log.mockRestore();
    });

    it('should handle missing query parameters and return transactions', async () => {
        const mockReqWithoutParams = { query: {} };
    
        const mockTransactions = [
            {
                transaction_id: 'T123456',
                date_time: new Date(),
                status: 'pending',
                providerDetails: { msisdn: '1234567890' },
                merchant: {
                    username: 'Merchant1',
                    groups: [
                        {
                            merchant: {
                                jazzCashMerchant: true,
                            },
                        },
                    ],
                },
            },
        ];
    
        prisma.transaction.findMany.mockResolvedValue(mockTransactions);
    
        await transactionController.getTransactions(mockReqWithoutParams, mockRes);
    
        expect(prisma.transaction.findMany).toHaveBeenCalledWith({
            where: {},
            orderBy: { date_time: 'desc' },
            include: {
                merchant: {
                    include: {
                        groups: {
                            include: {
                                merchant: {
                                    include: {
                                        jazzCashMerchant: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
    
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
            transactions: [
                {
                    transaction_id: 'T123456',
                    date_time: expect.any(Date),
                    status: 'pending',
                    providerDetails: { msisdn: '1234567890' },
                    merchant: {
                        username: 'Merchant1',
                        groups: [
                            {
                                merchant: {
                                    jazzCashMerchant: true,
                                },
                            },
                        ],
                    },
                    jazzCashMerchant: true,
                },
            ],
            meta: {},
        });
    });
    
});
