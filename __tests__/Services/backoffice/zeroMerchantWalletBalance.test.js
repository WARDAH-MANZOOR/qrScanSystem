import prisma from "../../../dist/prisma/client.js";
import CustomError from "../../../dist/utils/custom_error.js";
import backofficeService from "../../../dist/services/backoffice/backoffice.js";

jest.mock("../../../dist/prisma/client.js", () => ({
    __esModule: true,
    default: {
        transaction: {
            findMany: jest.fn(),
            deleteMany: jest.fn(),
            updateMany: jest.fn(), 
        },
        scheduledTask: { deleteMany: jest.fn() },
        settlementReport: { deleteMany: jest.fn() },
        disbursement: { deleteMany: jest.fn() },
    },
}));

describe('zeroMerchantWalletBalance', () => {
    const merchantId = 'test-merchant-id';

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should zero wallet balance successfully', async () => {
        // Ensure updateMany returns a valid response
        prisma.transaction.updateMany.mockResolvedValue({ count: 1 });

        // Call the function and store the result
        const result = await backofficeService.zeroMerchantWalletBalance(merchantId);

        // Assert that the function returns the expected success message
        expect(result).toBe('Wallet balance zeroed successfully.');

        // Ensure prisma.transaction.updateMany was called with the correct arguments
        expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
            where: { merchant_id: merchantId, status: 'completed' },
            data: { balance: 0 },
        });
    });
    // test('zeroMerchantWalletBalance should update transactions and return success message', async () => {
    //     prisma.transaction.updateMany = jest.fn().mockResolvedValue({ count: 1 });
    //     await expect(backofficeService.zeroMerchantWalletBalance(123)).resolves.toBe('Wallet balance zeroed successfully.');
    //     expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
    //         where: { merchant_id: 123, status: 'completed' },
    //         data: { balance: 0 }
    //     });
    // });
    test('should throw an error if update fails', async () => {
        prisma.transaction.updateMany.mockRejectedValue(new Error('Database error'));

        await expect(backofficeService.zeroMerchantWalletBalance(merchantId))
            .rejects.toThrow(CustomError);
        await expect(backofficeService.zeroMerchantWalletBalance(merchantId))
            .rejects.toThrow('Error zeroing wallet balance');
    });
});
