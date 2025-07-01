import prisma from "../../../../dist/prisma/client.js";
import CustomError from "../../../../dist/utils/custom_error.js";
import transactionsCreateService from "../../../../dist/services/transactions/create.js"; // Adjust the import path based on your project structure

jest.mock("../../../../dist/prisma/client.js", () => ({
    merchantFinancialTerms: {
        findUnique: jest.fn(),
    },
}));
beforeEach(() => {
    jest.clearAllMocks(); // Reset mock state before each test
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
    jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.error
});

  afterEach(() => {
    console.error.mockRestore(); // Restore console.error after tests
  });

describe("getMerchantCommission", () => {
    it("should return the correct commission for a valid merchant", async () => {
        const merchantId = 1;
        const mockMerchant = {
            commissionRate: "10",
            commissionGST: "2",
            commissionWithHoldingTax: "1",
        };

        prisma.merchantFinancialTerms.findUnique.mockResolvedValue(mockMerchant);

        const result = await transactionsCreateService.getMerchantCommission(merchantId, prisma);

        expect(prisma.merchantFinancialTerms.findUnique).toHaveBeenCalledWith({
            where: { merchant_id: merchantId },
        });
        expect(result).toBe(13);  // 10 + 2 + 1 = 13
    });

    it("should throw a CustomError when the merchant is not found", async () => {
        const merchantId = 1;

        prisma.merchantFinancialTerms.findUnique.mockResolvedValue(null);  // Simulate no merchant found

        try {
            await transactionsCreateService.getMerchantCommission(merchantId, prisma);
        } catch (error) {
            expect(error).toBeInstanceOf(CustomError);
            expect(error.message).toBe("Merchant not found");
            expect(error.statusCode).toBe(404);
        }
    });
});
