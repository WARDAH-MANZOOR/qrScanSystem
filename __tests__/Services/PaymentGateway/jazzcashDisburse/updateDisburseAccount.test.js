import prisma from '../../../../dist/prisma/client.js';
import CustomError from '../../../../dist/utils/custom_error.js';
import jazzcashDisburse from '../../../../dist/services/paymentGateway/jazzcashDisburse.js';

describe('updateDisburseAccount', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should update a disburse account successfully', async () => {
        const accountId = 1;
        const payload = {
            initialVector: 'newVector',
            key: 'newKey',
            tokenKey: 'newTokenKey',
        };
        const updatedAccount = {
            id: accountId,
            initialVector: payload.initialVector,
            key: payload.key,
            tokenKey: payload.tokenKey,
        };

        prisma.$transaction = jest.fn().mockResolvedValue(updatedAccount);

        const result = await jazzcashDisburse.updateDisburseAccount(accountId, payload);

        expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
        expect(result).toEqual({
            message: 'Disburse account updated successfully',
            data: updatedAccount,
        });
    });

    test('should throw a CustomError if the disburse account update fails', async () => {
        const accountId = 1;
        const payload = {
            initialVector: 'newVector',
            key: 'newKey',
            tokenKey: 'newTokenKey',
        };

        prisma.$transaction = jest.fn().mockResolvedValue(null);

        await expect(jazzcashDisburse.updateDisburseAccount(accountId, payload)).rejects.toThrow(
            new CustomError('An error occurred while updating the disburse account', 500)
        );

        expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
    });

    test('should throw a CustomError if an exception occurs during update', async () => {
        const accountId = 1;
        const payload = {
            initialVector: 'newVector',
            key: 'newKey',
            tokenKey: 'newTokenKey',
        };

        prisma.$transaction = jest.fn().mockRejectedValue(new Error('Database error'));

        await expect(jazzcashDisburse.updateDisburseAccount(accountId, payload)).rejects.toThrow(
            new CustomError('Database error', 500)
        );

        expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
    });
});
