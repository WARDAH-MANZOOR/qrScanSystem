import transactionController from '../../../../dist/controller/transactions/index.js';
import prisma from '../../../../dist/prisma/client.js';
import CustomError from '../../../../dist/utils/custom_error.js';
import { getDateRange } from '../../../../dist/utils/date_method.js';
import { getAllProfitsBalancesByMerchant, getProfitAndBalance } from "@prisma/client/sql";

jest.mock('../../../../dist/prisma/client.js', () => ({
    $queryRawTyped: jest.fn(),
}));

jest.mock('../../../../dist/utils/custom_error.js', () => {
    return jest.fn().mockImplementation((message, statusCode) => ({
        message,
        statusCode,
    }));
});

jest.mock('../../../../dist/utils/date_method.js', () => ({
    getDateRange: jest.fn(),
}));

jest.mock('@prisma/client/sql', () => ({
    getAllProfitsBalancesByMerchant: jest.fn(),
    getProfitAndBalance: jest.fn(),
}));

describe('getProAndBal', () => {
    const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return profit and balance data for a merchant if merchantId is provided', async () => {
        const mockReq = {
            query: {
                merchantId: '123',
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                range: 'custom',
            },
        };

        const mockData = [{ profit: 100, balance: 500 }];
        
        // Mock the getDateRange method to return specific date range
        getDateRange.mockReturnValue({
            fromDate: '2024-01-01',
            toDate: '2024-01-31',
        });

        // Mock the getAllProfitsBalancesByMerchant to return the correct SQL query string
        getAllProfitsBalancesByMerchant.mockReturnValue('SELECT * FROM profits WHERE merchantId = 123 AND date BETWEEN "2024-01-01" AND "2024-01-31"');

        // Mock the prisma.$queryRawTyped method to resolve with mockData
        prisma.$queryRawTyped.mockResolvedValue(mockData);

        await transactionController.getProAndBal(mockReq, mockRes);

        expect(getDateRange).toHaveBeenCalledWith('custom', '2024-01-01', '2024-01-31');
        expect(prisma.$queryRawTyped).toHaveBeenCalledWith('SELECT * FROM profits WHERE merchantId = 123 AND date BETWEEN "2024-01-01" AND "2024-01-31"'); 
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(mockData);
    });

    it('should return profit and balance data for all merchants if merchantId is not provided', async () => {
        const mockReq = {
            query: {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                range: 'custom',
            },
        };

        const mockData = [
            { merchantId: 1, profit: 100, balance: 500 },
            { merchantId: 2, profit: 200, balance: 800 },
        ];

        getDateRange.mockReturnValue({
            fromDate: '2024-01-01',
            toDate: '2024-01-31',
        });

        // Mock the getProfitAndBalance to return the correct SQL query string
        getProfitAndBalance.mockReturnValue('SELECT * FROM profits WHERE date BETWEEN "2024-01-01" AND "2024-01-31"');

        prisma.$queryRawTyped.mockResolvedValue(mockData);

        await transactionController.getProAndBal(mockReq, mockRes);

        expect(getDateRange).toHaveBeenCalledWith('custom', '2024-01-01', '2024-01-31');
        expect(prisma.$queryRawTyped).toHaveBeenCalledWith('SELECT * FROM profits WHERE date BETWEEN "2024-01-01" AND "2024-01-31"'); 
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(mockData);
    });

    it('should handle errors and return 500 status with an error message', async () => {
        const mockReq = {
            query: {
                merchantId: '123',
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                range: 'custom',
            },
        };

        const mockError = new Error('Database connection failed');

        getDateRange.mockReturnValue({
            fromDate: '2024-01-01',
            toDate: '2024-01-31',
        });

        prisma.$queryRawTyped.mockRejectedValue(mockError);

        jest.spyOn(console, 'log').mockImplementation(() => {});

        await transactionController.getProAndBal(mockReq, mockRes);

        expect(console.log).toHaveBeenCalledWith(mockError);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.send).toHaveBeenCalledWith({
            message: 'Internal Server Error',
            statusCode: 500,
        });

        console.log.mockRestore();
    });
});
