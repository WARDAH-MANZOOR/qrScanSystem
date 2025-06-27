import  easyPaisaService  from "../../../../dist/services/paymentGateway/easypaisa.js";
import CustomError from "../../../../dist/utils/custom_error.js";
import prisma from "../../../../dist/prisma/client.js"; // or wherever your Prisma client is imported

jest.mock("../../../../dist/prisma/client.js", () => ({
    $transaction: jest.fn(),
}));

describe('deleteMerchant', () => {
    let mockMerchantId;

    beforeEach(() => {
        mockMerchantId = 1;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should delete a merchant successfully with a valid merchantId', async () => {
        const mockDeletedMerchant = { id: 1, name: 'Test Merchant', metadata: { key: 'value' } };

        prisma.$transaction.mockResolvedValueOnce(mockDeletedMerchant);

        const result = await easyPaisaService.deleteMerchant(mockMerchantId);

        expect(result).toEqual({
            message: 'Merchant deleted successfully',
        });
    });

    it('should throw a 400 error if merchantId is not provided', async () => {
        await expect(easyPaisaService.deleteMerchant(null))
            .rejects
            .toThrowError(new CustomError("Merchant ID is required", 400));
    });

    it('should throw a 500 error if merchant deletion fails (merchant not found or other issue)', async () => {
        prisma.$transaction.mockResolvedValueOnce(null); // Simulate that the merchant was not found

        await expect(easyPaisaService.deleteMerchant(mockMerchantId))
            .rejects
            .toThrowError(new CustomError("An error occurred while deleting the merchant", 500));
    });

    it('should throw a 500 error if an unexpected error occurs during the transaction', async () => {
        const mockError = new Error("Database connection failed");
        prisma.$transaction.mockRejectedValueOnce(mockError); // Simulate an error from Prisma

        await expect(easyPaisaService.deleteMerchant(mockMerchantId))
            .rejects
            .toThrowError(new CustomError("Database connection failed", 500));
    });
});
