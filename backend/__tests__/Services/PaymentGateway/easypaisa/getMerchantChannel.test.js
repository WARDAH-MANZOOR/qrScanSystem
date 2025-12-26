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

describe("EasyPaisa Service Tests", () => {
    describe("getMerchantChannel", () => {
        it("should return merchant's EasyPaisa payment method if merchant exists", async () => {
            const merchantId = "merchant123";
            const mockPaymentMethod = { easypaisaPaymentMethod: true };

            prisma.merchant.findFirst.mockResolvedValue(mockPaymentMethod);

            const result = await easyPaisaService.getMerchantChannel(merchantId);
            expect(prisma.merchant.findFirst).toHaveBeenCalledWith({
                where: { uid: merchantId },
                select: { easypaisaPaymentMethod: true },
            });
            expect(result).toEqual(mockPaymentMethod);
        });

        it("should return null if merchant does not exist", async () => {
            const merchantId = "merchant123";

            prisma.merchant.findFirst.mockResolvedValue(null);

            const result = await easyPaisaService.getMerchantChannel(merchantId);
            expect(result).toBeNull();
        });
    });
});