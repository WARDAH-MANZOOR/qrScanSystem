import prisma from "../../../../dist/prisma/client.js";
import CustomError from "../../../../dist/utils/custom_error.js";
import { hashPassword } from "../../../../dist/services/authentication/index.js";
import merchantService from "../../../../dist/services/merchant/index.js";

// Mock prisma client
jest.mock('../../../../dist/prisma/client.js', () => ({
  merchant: {
    findFirst: jest.fn(),
  },
}));

jest.mock('../../../../dist/utils/custom_error.js'); // Mock CustomError

describe('findOne function', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return merchant data when given a valid UID', async () => {
        const mockMerchantData = { id: 1, uid: '123', commissions: [] };
        
        // Mock prisma.merchant.findFirst to return mock data
        prisma.merchant.findFirst.mockResolvedValue(mockMerchantData);

        const params = { uid: '123' };
        const result = await merchantService.findOne(params);

        // Check if the function returns the correct result
        expect(result).toEqual(mockMerchantData);
        expect(prisma.merchant.findFirst).toHaveBeenCalledWith({
            where: { uid: '123' },
            include: { commissions: true },
        });
    });

    it('should return undefined when no merchant is found for a given UID', async () => {
        prisma.merchant.findFirst.mockResolvedValue(null);

        const params = { uid: 'non-existent-uid' };
        const result = await merchantService.findOne(params);

        expect(result).toBeNull();
        expect(prisma.merchant.findFirst).toHaveBeenCalledWith({
            where: { uid: 'non-existent-uid' },
            include: { commissions: true },
        });
    });


    it('should handle empty params gracefully', async () => {
        const mockMerchantData = { id: 1, uid: '123', commissions: [] };

        prisma.merchant.findFirst.mockResolvedValue(mockMerchantData);

        const params = {};  // empty params
        const result = await merchantService.findOne(params);

        expect(result).toEqual(mockMerchantData);
        expect(prisma.merchant.findFirst).toHaveBeenCalledWith({
            where: {},
            include: { commissions: true },
        });
    });
});
