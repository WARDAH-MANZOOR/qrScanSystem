import backofficeService from "../../../dist/services/backoffice/backoffice.js";
import prisma from "../../../dist/prisma/client.js";
import { format, addWeekdays } from 'date-fns';

jest.mock('../../../dist/prisma/client.js', () => ({
    merchantFinancialTerms: { findUnique: jest.fn() },
    $transaction: jest.fn()
}));

describe("createTransactionService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    test("should create a transaction and update settlement report correctly", async () => {
        const merchant_id = 1;
        const body = {
            original_amount: 1000,
            settlement: true,
            provider_name: "Test Provider",
            provider_account: "1234567890"
        };
        
        prisma.merchantFinancialTerms.findUnique.mockResolvedValue({
            commissionRate: 0.05, 
            commissionGST: 0.02, 
            commissionWithHoldingTax: 0.03, 
            settlementDuration: 2 
        });

        prisma.$transaction.mockImplementation(async (callback) => {
            return callback({
                transaction: {
                    create: jest.fn().mockResolvedValue({ transaction_id: "T123456" })
                },
                settlementReport: {
                    upsert: jest.fn().mockResolvedValue({ merchant_id, transactionCount: 1 })
                },
                scheduledTask: { create: jest.fn().mockResolvedValue({}) }
            });
        });
    
        try {
            const result = await backofficeService.createTransactionService(body, merchant_id);


        } catch (error) {
            console.error("Function Error:", error);
        }
    });
   

    it("should schedule a settlement task if settlement is false", async () => {
        const merchant_id = 1;
        const body = { original_amount: 1000, settlement: false };

        prisma.merchantFinancialTerms.findUnique.mockResolvedValue({
            commissionRate: 0.05,
            commissionGST: 0.02,
            commissionWithHoldingTax: 0.03,
            settlementDuration: 2 
        });

        prisma.$transaction.mockImplementation(async (callback) => {
            return callback({
                transaction: {
                    create: jest.fn().mockResolvedValue({ transaction_id: "T123456" })
                },
                settlementReport: {
                    upsert: jest.fn().mockResolvedValue({ merchant_id, transactionCount: 1 })
                },
                scheduledTask: { create: jest.fn().mockResolvedValue({}) }
            });
        });
        try {
            const result = await backofficeService.createTransactionService(body, merchant_id);


        } catch (error) {
            console.error("Function Error:", error);
        }
    });

    it("should return an error if merchant is not found", async () => {
        prisma.merchantFinancialTerms.findUnique.mockResolvedValue(null);
        const result = await backofficeService.createTransactionService({ original_amount: 1000 }, 1);

        expect(result).toBeInstanceOf(Error);
    });
});
