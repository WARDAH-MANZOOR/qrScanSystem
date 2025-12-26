import { Decimal } from "@prisma/client/runtime/library";
import transactionsService from "../../../../dist/services/transactions/index.js"; // Replace with actual path
import prisma from "../../../../dist/prisma/client.js"; // Mock Prisma client
jest.mock('../../../../dist/prisma/client.js', () => ({
    merchant: {
        update: jest.fn(),
    },
}));

describe('updateMerchantSwitch', () => {
    beforeEach(() => {
        jest.clearAllMocks(); // Reset mock state before each test
        jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
        jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.error
    });
    
      afterEach(() => {
        jest.clearAllMocks();
      });
    it('should update the merchant payment method and last switch timestamp', async () => {
        const mockMerchantId = 'merchant123';
        const mockProvider = 'SWITCH';
        const mockDate = new Date();

        // Mock implementation of Prisma update
        prisma.merchant.update.mockResolvedValue({
            merchant_id: mockMerchantId,
            easypaisaPaymentMethod: mockProvider,
            lastSwich: mockDate,
        });

        // Mock Date.now() to avoid test failures due to time differences
        jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

        // Call the function
        await transactionsService.updateMerchantSwitch(mockProvider, mockMerchantId);

        // Verify Prisma update was called correctly
        expect(prisma.merchant.update).toHaveBeenCalledWith({
            where: { merchant_id: mockMerchantId },
            data: {
                easypaisaPaymentMethod: mockProvider,
                lastSwich: mockDate,
            },
        });

        // Restore the original Date implementation
        jest.restoreAllMocks();
    });
});