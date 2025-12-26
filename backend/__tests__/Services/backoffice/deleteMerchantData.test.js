import prisma from "../../../dist/prisma/client.js";
import backofficeService from "../../../dist/services/backoffice/backoffice.js";

jest.mock("../../../dist/prisma/client.js", () => {
    return {
        $transaction: jest.fn(),
        $disconnect: jest.fn(),
        userGroup: { deleteMany: jest.fn() },
        merchantFinancialTerms: { deleteMany: jest.fn() },
        merchantProviderCredential: { deleteMany: jest.fn() },
        disbursement: { deleteMany: jest.fn() },
        settlementReport: { deleteMany: jest.fn() },
        transaction: { deleteMany: jest.fn() },
        merchant: { delete: jest.fn() },
        user: { delete: jest.fn() }
    };
});

beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});

    prisma.$transaction.mockImplementation(async (callback) => {
        return await callback(prisma);
    });
});

afterEach(() => {
    console.error.mockRestore();
    console.log.mockRestore();
});

describe("deleteMerchantData", () => {
    it("should delete merchant and related data successfully", async () => {
        const merchantId = 123;
        try {
            const result = await backofficeService.deleteMerchantData(merchantId);

        
        
        } catch (error) {
            expect(prisma.$transaction).toHaveBeenCalledTimes(1);
        expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { timeout: 10000 });

        expect(prisma.userGroup.deleteMany).toHaveBeenCalledWith({ where: { merchantId } });
        expect(prisma.merchantFinancialTerms.deleteMany).toHaveBeenCalledWith({ where: { merchant_id: merchantId } });
        expect(prisma.merchantProviderCredential.deleteMany).toHaveBeenCalledWith({ where: { merchant_id: merchantId } });
        expect(prisma.disbursement.deleteMany).toHaveBeenCalledWith({ where: { merchant_id: merchantId } });
        expect(prisma.settlementReport.deleteMany).toHaveBeenCalledWith({ where: { merchant_id: merchantId } });
        expect(prisma.transaction.deleteMany).toHaveBeenCalledWith({ where: { merchant_id: merchantId } });
        expect(prisma.merchant.delete).toHaveBeenCalledWith({ where: { merchant_id: merchantId } });
        expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: merchantId } });

        expect(prisma.$disconnect).toHaveBeenCalledTimes(1);
            console.error("Function Error:", error);
        }
    });
           
    it("should handle errors gracefully", async () => {
        const merchantId = 123;
        prisma.$transaction.mockRejectedValue(new Error("Transaction failed"));

        console.error = jest.fn();

        await backofficeService.deleteMerchantData(merchantId);
        expect(console.error).toHaveBeenCalledWith(
            `Error deleting merchant with ID ${merchantId}:`,
            expect.any(Error)
        );
    });

    it("should always disconnect Prisma client after execution", async () => {
        const merchantId = 123;
        try {
            const result = await backofficeService.deleteMerchantData(merchantId);
        
        } catch (error) {
            console.error("Function Error:", error);
            expect(prisma.$disconnect).toHaveBeenCalledTimes(1);

        }

    });
});
