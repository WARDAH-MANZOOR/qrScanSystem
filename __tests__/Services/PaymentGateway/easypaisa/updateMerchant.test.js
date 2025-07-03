import  easyPaisaService  from "../../../../dist/services/paymentGateway/easypaisa.js";
import CustomError from "../../../../dist/utils/custom_error.js";
import prisma from "../../../../dist/prisma/client.js"; // or wherever your Prisma client is imported

jest.mock("../../../../dist/prisma/client.js", () => ({
    $transaction: jest.fn(),
}));

describe('updateMerchant', () => {
    let mockMerchantId;
    let mockUpdateData;

    beforeEach(() => {
        mockMerchantId = 1;
        mockUpdateData = { name: 'Updated Merchant' };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should update a merchant successfully with valid data', async () => {
        const mockUpdatedMerchant = { id: 1, name: 'Updated Merchant', metadata: { key: 'value' } };

        prisma.$transaction.mockResolvedValueOnce(mockUpdatedMerchant);

        const result = await easyPaisaService.updateMerchant(mockMerchantId, mockUpdateData);

        expect(result).toEqual({
            message: 'Merchant updated successfully',
            data: mockUpdatedMerchant,
        });
    });

    it('should throw a 400 error if merchantId is not provided', async () => {
        await expect(easyPaisaService.updateMerchant(null, mockUpdateData))
            .rejects
            .toThrowError(new CustomError("Merchant ID is required", 400));
    });

    it('should throw a 400 error if updateData is not provided', async () => {
        await expect(easyPaisaService.updateMerchant(mockMerchantId, null))
            .rejects
            .toThrowError(new CustomError("Update data is required", 400));
    });

    it('should throw a 500 error if merchant update fails (merchant not found or other issue)', async () => {
        prisma.$transaction.mockResolvedValueOnce(null); // Simulate that the update didn't find a matching merchant

        await expect(easyPaisaService.updateMerchant(mockMerchantId, mockUpdateData))
            .rejects
            .toThrowError(new CustomError("An error occurred while updating the merchant", 500));
    });

    it('should throw a 500 error if an unexpected error occurs during the transaction', async () => {
        const mockError = new Error("Database connection failed");
        prisma.$transaction.mockRejectedValueOnce(mockError); // Simulate an error from Prisma

        await expect(easyPaisaService.updateMerchant(mockMerchantId, mockUpdateData))
            .rejects
            .toThrowError(new CustomError("Database connection failed", 500));
    });
});
