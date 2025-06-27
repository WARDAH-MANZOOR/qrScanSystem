import transactionsService from "../../../../dist/services/transactions/index.js"; // Replace with actual path
import prisma from "../../../../dist/prisma/client.js"; // Mock Prisma client
jest.mock('../../../../dist/prisma/client.js', () => ({
    merchant: {
        findFirst: jest.fn(),
    },
}));

describe('getMerchantInquiryMethod', () => {
    const mockMerchantId = 'merchant123';

    afterEach(() => {
        jest.clearAllMocks(); // Clear mocks after each test
    });
    it('should return the correct easypaisaInquiryMethod for getMerchantInquiryMethod', async () => {
        const mockResponse = { easypaisaInquiryMethod: 'API' };

        // Mock Prisma response
        prisma.merchant.findFirst.mockResolvedValue(mockResponse);

        // Call the function
        const result = await transactionsService.getMerchantInquiryMethod(mockMerchantId);

        // Assertions
        expect(prisma.merchant.findFirst).toHaveBeenCalledWith({
            where: { uid: mockMerchantId },
            select: { easypaisaInquiryMethod: true },
        });
        expect(result).toEqual(mockResponse);
    });
});