import prisma from '../../../../dist/prisma/client.js';
import CustomError from '../../../../dist/utils/custom_error.js';
import jazzcashDisburse from '../../../../dist/services/paymentGateway/jazzcashDisburse.js';

describe('deleteDisburseAccount', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should delete a disburse account successfully', async () => {
        const accountId = 1;
        const deletedAccount = {
            id: accountId,
            deletedAt: new Date(),
        };

        prisma.$transaction = jest.fn().mockResolvedValue(deletedAccount);

        const result = await jazzcashDisburse.deleteDisburseAccount(accountId);

        expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
        expect(result).toEqual({
            message: 'Disburse account deleted successfully',
            data: deletedAccount,
        });
    });

    test('should throw a CustomError if the disburse account deletion fails', async () => {
        const accountId = 1;

        prisma.$transaction = jest.fn().mockResolvedValue(null);

        await expect(jazzcashDisburse.deleteDisburseAccount(accountId)).rejects.toThrow(
            new CustomError('An error occurred while deleting the disburse account', 500)
        );

        expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
    });

    test('should throw a CustomError if an exception occurs during deletion', async () => {
        const accountId = 1;

        prisma.$transaction = jest.fn().mockRejectedValue(new Error('Database error'));

        await expect(jazzcashDisburse.deleteDisburseAccount(accountId)).rejects.toThrow(
            new CustomError('Database error', 500)
        );

        expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
    });
});
