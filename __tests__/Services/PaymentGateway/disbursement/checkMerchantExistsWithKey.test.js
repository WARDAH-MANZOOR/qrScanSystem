import prisma from "../../../../dist/prisma/client.js";
import {checkMerchantExistsWithKey} from "../../../../dist/services/paymentGateway/disbursement.js";  // Adjust the import as needed
import CustomError from "../../../../dist/utils/custom_error.js";

// Mock prisma.merchant.findMany method
jest.mock("../../../../dist/prisma/client.js", () => ({
    merchant: {
        findMany: jest.fn(),
    },
}));

describe('checkMerchantExistsWithKey', () => {
    beforeEach(() => {
        jest.clearAllMocks(); // Clear mocks before each test
    });

    it('should return true when the merchant exists', async () => {
        // Mock the response of prisma.merchant.findMany to simulate a merchant being found
        prisma.merchant.findMany.mockResolvedValue([{ uid: 'merchant123' }]);

        const result = await checkMerchantExistsWithKey('merchant123');
        
        expect(result).toBe(true);
        expect(prisma.merchant.findMany).toHaveBeenCalledWith({
            where: { uid: 'merchant123' },
        });
    });

    it('should return false when the merchant does not exist', async () => {
        // Mock the response of prisma.merchant.findMany to simulate no merchant found
        prisma.merchant.findMany.mockResolvedValue([]);

        const result = await checkMerchantExistsWithKey('merchant999');
        
        expect(result).toBe(false);
        expect(prisma.merchant.findMany).toHaveBeenCalledWith({
            where: { uid: 'merchant999' },
        });
    });

    it('should handle errors gracefully if prisma.merchant.findMany fails', async () => {
        // Mock the response of prisma.merchant.findMany to simulate an error
        prisma.merchant.findMany.mockRejectedValue(new Error('Database error'));

        // Expecting the function to throw a CustomError
        await expect(checkMerchantExistsWithKey('merchant123'))
            .rejects
            .toThrowError(new CustomError('Database error', 500));
    });
});
