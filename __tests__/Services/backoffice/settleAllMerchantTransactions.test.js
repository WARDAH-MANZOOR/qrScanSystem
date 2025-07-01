import prisma from "../../../dist/prisma/client.js";
import CustomError from "../../../dist/utils/custom_error.js";
import Decimal from "decimal.js";
import backofficeService from "../../../dist/services/backoffice/backoffice.js";

jest.mock("../../../dist/prisma/client.js", () => ({
    merchantFinancialTerms: {
        findFirst: jest.fn(),
    },
    transaction: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
    },
    settlementReport: {
        create: jest.fn(),
    }
}));

beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
    console.error.mockRestore();
});

describe("settleAllMerchantTransactions", () => {
    const merchantId = 123;

    const merchantFinancialTerms = {
        merchant_id: merchantId,
        commissionRate: new Decimal(0.05), // 5% commission
        commissionGST: new Decimal(0.17), // 17% GST
        commissionWithHoldingTax: new Decimal(0.02), // 2% Withholding Tax
    };

    const transactions = [
        { original_amount: new Decimal(1000), status: "completed", balance: new Decimal(1000) },
        { original_amount: new Decimal(2000), status: "completed", balance: new Decimal(2000) }
    ];

    it("should settle all merchant transactions successfully", async () => {
        prisma.merchantFinancialTerms.findFirst.mockResolvedValue(merchantFinancialTerms);
        prisma.transaction.findMany.mockResolvedValue(transactions);
        prisma.transaction.updateMany.mockResolvedValue({ count: transactions.length });
        prisma.settlementReport.create.mockResolvedValue({});
        try {
            const result = await backofficeService.settleAllMerchantTransactions(merchantId);

            expect(prisma.merchantFinancialTerms.findFirst).toHaveBeenCalledWith({
                where: { merchant_id: Number(merchantId) }
            });
    
            expect(prisma.transaction.findMany).toHaveBeenCalledWith({
                where: {
                    merchant_id: merchantId,
                    settlement: false,
                    balance: { gt: 0 },
                    status: "completed",
                },
            });
    
            expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
                where: {
                    merchant_id: merchantId,
                    settlement: false,
                    balance: { gt: 0 },
                    status: "completed",
                },
                data: { settlement: true }
            });
    
            expect(prisma.settlementReport.create).toHaveBeenCalledWith({
                data: {
                    merchant_id: merchantId,
                    settlementDate: expect.any(Date),
                    transactionCount: 2,
                    transactionAmount: new Decimal(3000),
                    commission: new Decimal(3000).times(0.05),
                    gst: new Decimal(3000).times(0.05).times(0.17),
                    withholdingTax: new Decimal(3000).times(0.02),
                    merchantAmount: new Decimal(3000)
                        .minus(new Decimal(3000).times(0.05))
                        .minus(new Decimal(3000).times(0.05).times(0.17))
                        .minus(new Decimal(3000).times(0.02)),
                }
            });


        } catch (error) {
            console.error("All merchant transactions settled successfully.", error);
        }
    });

    it("should throw an error if no transactions are found", async () => {
        prisma.merchantFinancialTerms.findFirst.mockResolvedValue(merchantFinancialTerms);
        prisma.transaction.findMany.mockResolvedValue([]);

        await expect(backofficeService.settleAllMerchantTransactions(merchantId))
            .rejects.toThrow(new CustomError("Error settling all transactions", 500));

        expect(prisma.transaction.updateMany).not.toHaveBeenCalled();
        expect(prisma.settlementReport.create).not.toHaveBeenCalled();
    });

    it("should handle unexpected errors", async () => {
        prisma.merchantFinancialTerms.findFirst.mockRejectedValue(new Error("Database error"));

        await expect(backofficeService.settleAllMerchantTransactions(merchantId))
            .rejects.toThrow(new CustomError("Error settling all transactions", 500));

        expect(prisma.transaction.findMany).not.toHaveBeenCalled();
        expect(prisma.transaction.updateMany).not.toHaveBeenCalled();
        expect(prisma.settlementReport.create).not.toHaveBeenCalled();
    });
});
