// Import necessary modules and mock dependencies
import prisma from "../../../../dist/prisma/client.js";
import easyPaisaService from "../../../../dist/services/paymentGateway/easypaisa.js";

jest.mock("../../../../dist/prisma/client.js", () => ({
    merchant: {
        findFirst: jest.fn(),
    },
    transaction: {
        findFirst: jest.fn(),
    },
}));
describe('getMerchantInquiryMethod', () => {
    it('should return easypaisaInquiryMethod when merchant is found', async () => {
      const mockMerchant = { easypaisaInquiryMethod: 'INQUIRY_API' };
      prisma.merchant.findFirst = jest.fn().mockResolvedValue(mockMerchant);

      const result = await easyPaisaService.getMerchantInquiryMethod('merchant123');
      expect(result).toEqual(mockMerchant);
      expect(prisma.merchant.findFirst).toHaveBeenCalledWith({
        where: { uid: 'merchant123' },
        select: { easypaisaInquiryMethod: true },
      });
    });

    it('should return null when merchant is not found', async () => {
      prisma.merchant.findFirst = jest.fn().mockResolvedValue(null);

      const result = await easyPaisaService.getMerchantInquiryMethod('merchant123');
      expect(result).toBeNull();
      expect(prisma.merchant.findFirst).toHaveBeenCalledWith({
        where: { uid: 'merchant123' },
        select: { easypaisaInquiryMethod: true },
      });
    });
  });