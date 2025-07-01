import { Decimal } from "@prisma/client/runtime/library";
import CustomError from "../../../../dist/utils/custom_error.js";
import { getMerchantRate } from "../../../../dist/services/paymentGateway/disbursement.js";

// Mock the Prisma client
const mockPrisma = {
    merchantFinancialTerms: {
        findFirst: jest.fn(),
    },
};

describe("getMerchantRate", () => {
    beforeEach(() => {
        jest.spyOn(console, "log").mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("should return disbursement rates for a valid merchant ID", async () => {
        const mockMerchantId = "12";
        const mockMerchantData = {
            disbursementRate: "10.50",
            disbursementGST: "2.00",
            disbursementWithHoldingTax: "1.50",
        };

        mockPrisma.merchantFinancialTerms.findFirst.mockResolvedValue(mockMerchantData);

        const result = await getMerchantRate(mockPrisma, mockMerchantId);

        expect(mockPrisma.merchantFinancialTerms.findFirst).toHaveBeenCalledWith({
            where: { merchant_id: mockMerchantId },
        });
        expect(result).toEqual({
            disbursementRate: new Decimal(mockMerchantData.disbursementRate),
            disbursementGST: new Decimal(mockMerchantData.disbursementGST),
            disbursementWithHoldingTax: new Decimal(mockMerchantData.disbursementWithHoldingTax),
        });
    });

    test("should throw an error if merchant ID does not exist", async () => {
        const mockMerchantId = "3";

        mockPrisma.merchantFinancialTerms.findFirst.mockResolvedValue(null);

        await expect(getMerchantRate(mockPrisma, mockMerchantId)).rejects.toThrow(
            new CustomError("Merchant not found", 404)
        );

        expect(mockPrisma.merchantFinancialTerms.findFirst).toHaveBeenCalledWith({
            where: { merchant_id: mockMerchantId },
        });
    });

});
