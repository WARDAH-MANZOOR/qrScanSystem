import prisma from '../../../../dist/prisma/client.js';
import CustomError from '../../../../dist/utils/custom_error.js';
import jazzcashDisburse from '../../../../dist/services/paymentGateway/jazzcashDisburse.js';

describe('getDisburseAccount', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should retrieve a specific disburse account by ID', async () => {
        const accountId = 1;
        const mockAccount = {
            id: 1,
            initialVector: 'testVector',
            key: 'testKey',
            tokenKey: 'testTokenKey',
            deletedAt: null,
        };

        prisma.jazzCashDisburseAccount.findFirst = jest.fn().mockResolvedValue(mockAccount);

        const result = await jazzcashDisburse.getDisburseAccount(accountId);

        expect(prisma.jazzCashDisburseAccount.findFirst).toHaveBeenCalledWith({
            where: {
                id: accountId,
                deletedAt: null,
            },
        });
        expect(result).toEqual({
            message: 'Disburse account retrieved successfully',
            data: mockAccount,
        });
    });

    test('should throw a CustomError if the specific disburse account is not found', async () => {
        const accountId = 1;

        prisma.jazzCashDisburseAccount.findFirst = jest.fn().mockResolvedValue(null);

        await expect(jazzcashDisburse.getDisburseAccount(accountId)).rejects.toThrow(
            new CustomError('Disburse account not found', 404)
        );

        expect(prisma.jazzCashDisburseAccount.findFirst).toHaveBeenCalledWith({
            where: {
                id: accountId,
                deletedAt: null,
            },
        });
    });

    test('should retrieve all disburse accounts if no ID is provided', async () => {
        const mockAccounts = [
            {
                id: 2,
                initialVector: 'vector2',
                key: 'key2',
                tokenKey: 'tokenKey2',
                deletedAt: null,
            },
            {
                id: 1,
                initialVector: 'vector1',
                key: 'key1',
                tokenKey: 'tokenKey1',
                deletedAt: null,
            },
        ];

        prisma.jazzCashDisburseAccount.findMany = jest.fn().mockResolvedValue(mockAccounts);

        const result = await jazzcashDisburse.getDisburseAccount();

        expect(prisma.jazzCashDisburseAccount.findMany).toHaveBeenCalledWith({
            where: {
                deletedAt: null,
            },
            orderBy: {
                id: 'desc',
            },
        });
        expect(result).toEqual({
            message: 'Disburse account retrieved successfully',
            data: mockAccounts,
        });
    });

    test('should return an empty array if no disburse accounts are found', async () => {
        prisma.jazzCashDisburseAccount.findMany = jest.fn().mockResolvedValue([]);
    
        const result = await jazzcashDisburse.getDisburseAccount();
    
        expect(prisma.jazzCashDisburseAccount.findMany).toHaveBeenCalledWith({
            where: {
                deletedAt: null,
            },
            orderBy: {
                id: 'desc',
            },
        });
        expect(result).toEqual({
            message: 'Disburse account retrieved successfully',
            data: [],
        });
    });
    

    test('should throw a CustomError if an exception occurs', async () => {
        prisma.jazzCashDisburseAccount.findMany = jest.fn().mockRejectedValue(new Error('Database error'));

        await expect(jazzcashDisburse.getDisburseAccount()).rejects.toThrow(
            new CustomError('Database error', 500)
        );

        expect(prisma.jazzCashDisburseAccount.findMany).toHaveBeenCalledWith({
            where: {
                deletedAt: null,
            },
            orderBy: {
                id: 'desc',
            },
        });
    });
});
