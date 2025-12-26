import prisma from '../../../../dist/prisma/client.js';
import CustomError from '../../../../dist/utils/custom_error.js';
import jazzcashDisburse from '../../../../dist/services/paymentGateway/jazzcashDisburse.js';

describe('addDisburseAccount', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should create a new disburse account successfully', async () => {
        const payload = {
            initialVector: 'testVector',
            key: 'testKey',
            tokenKey: 'testTokenKey',
        };

        const mockNewAccount = {
            id: 1,
            initialVector: 'testVector',
            key: 'testKey',
            tokenKey: 'testTokenKey',
        };

        prisma.$transaction = jest.fn().mockImplementation(async (callback) => callback({
            jazzCashDisburseAccount: {
                create: jest.fn().mockResolvedValue(mockNewAccount),
            },
        }));

        const result = await jazzcashDisburse.addDisburseAccount(payload);

        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
        expect(result).toEqual({
            message: 'Disburse account created successfully',
            data: mockNewAccount,
        });
    });

    test('should throw a CustomError if new account creation fails', async () => {
        const payload = {
            initialVector: 'testVector',
            key: 'testKey',
            tokenKey: 'testTokenKey',
        };

        prisma.$transaction = jest.fn().mockImplementation(async (callback) => callback({
            jazzCashDisburseAccount: {
                create: jest.fn().mockResolvedValue(null),
            },
        }));

        await expect(jazzcashDisburse.addDisburseAccount(payload)).rejects.toThrow(
            new CustomError('An error occurred while creating the disburse account', 500)
        );

        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    test('should throw a CustomError if an exception occurs during account creation', async () => {
        const payload = {
            initialVector: 'testVector',
            key: 'testKey',
            tokenKey: 'testTokenKey',
        };

        prisma.$transaction = jest.fn().mockRejectedValue(new Error('Database error'));

        await expect(jazzcashDisburse.addDisburseAccount(payload)).rejects.toThrow(
            new CustomError('Database error', 500)
        );

        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
});
