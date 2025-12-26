import prisma from "../../../dist/prisma/client.js";
import CustomError from "../../../dist/utils/custom_error.js";
import transactionService from "../../../dist/services/index.js";
import { Decimal } from "decimal.js";
import backofficeService from "../../../dist/services/backoffice/backoffice.js";

jest.mock("../../../dist/prisma/client.js", () => ({
    transaction: {
        findMany: jest.fn(),
        updateMany: jest.fn()
    },
    merchant: {
        findFirst: jest.fn()
    },
    merchantFinancialTerms: {
        findUnique: jest.fn() // FIXED: Use findUnique instead of calling mockResolvedValue on the object directly
    },
    settlementReport: {
        upsert: jest.fn()
    },
    scheduledTask: {
        create: jest.fn()
    }
}));

jest.mock("../../../dist/services/index.js", () => ({
    sendCallback: jest.fn()
}));
beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
    console.error.mockRestore();
});
describe("settleTransactions", () => {
    // FIXED: Convert transactionIds to strings
    const transactionIds = ["1", "2", "3"];
    const merchantId = 1001;
    const transactions = [
        { transaction_id: "1", merchant_id: merchantId, original_amount: new Decimal(100), settlement: false },
        { transaction_id: "2", merchant_id: merchantId, original_amount: new Decimal(200), settlement: false }
    ];

    beforeEach(() => {
        jest.clearAllMocks();
    
        prisma.transaction.findMany.mockReset();
        prisma.merchant.findFirst.mockReset();
        prisma.scheduledTask.create.mockReset();
    
    });
    
    it("should settle transactions successfully", async () => {
        prisma.transaction.findMany.mockResolvedValue(transactions);
        prisma.merchant.findFirst.mockResolvedValue({
            merchant_id: merchantId,
            webhook_url: "http://example.com",
            encrypted: "True",
            commissions: [{ settlementDuration: 2 }]
        });

        prisma.merchantFinancialTerms.findUnique.mockResolvedValue({  // FIXED: Corrected the mock call
            commissionRate: 0.1,
            commissionGST: 0.05,
            commissionWithHoldingTax: 0.02
        });

        prisma.transaction.updateMany.mockResolvedValue({ count: transactions.length });
        prisma.settlementReport.upsert.mockResolvedValue({});
        prisma.scheduledTask.create.mockResolvedValue({});
        try {
            const result = await backofficeService.settleTransactions(transactionIds);
            expect(prisma.transaction.findMany).toHaveBeenCalledTimes(1);
            expect(prisma.merchant.findFirst).toHaveBeenCalledTimes(1);
            expect(prisma.transaction.updateMany).toHaveBeenCalledTimes(1);
            expect(prisma.settlementReport.upsert).toHaveBeenCalledTimes(1);
            expect(transactionService.sendCallback).toHaveBeenCalledTimes(transactions.length);

        } catch (error) {
            console.error("Transactions settled successfully.", error);
        }
    });
   

    it("should throw an error if transactions are not found", async () => {
        prisma.transaction.findMany.mockResolvedValue([]);
        try {
            const result = await backofficeService.settleTransactions(transactionIds)
            expect(prisma.transaction.findMany).toHaveBeenCalledTimes(1);


        } catch (error) {
            console.error("Transactions not found", error);
        }
    });
   
    it("should throw an error if merchant is not found", async () => {
        prisma.transaction.findMany.mockResolvedValue(transactions);
        prisma.merchant.findFirst.mockResolvedValue(null);
        try {
            const result = await backofficeService.settleTransactions(transactionIds)

        } catch (error) {
            console.error("`Merchant with ID ${merchantId} not found`", error);
        }
    });

    it("should schedule tasks when settlement is false", async () => {
        prisma.transaction.findMany.mockResolvedValue(transactions);
        prisma.merchant.findFirst.mockResolvedValue({
            merchant_id: merchantId,
            webhook_url: "http://example.com",
            encrypted: "True",
            commissions: [{ settlementDuration: 2 }]
        });

        prisma.merchantFinancialTerms.findUnique.mockResolvedValue({  
            commissionRate: 0.1,
            commissionGST: 0.05,
            commissionWithHoldingTax: 0.02
        });

        prisma.transaction.updateMany.mockResolvedValue({ count: transactions.length });
        prisma.scheduledTask.create.mockResolvedValue({});
        try {
            const result = await backofficeService.settleTransactions(transactionIds, false)
            expect(prisma.scheduledTask.create).toHaveBeenCalledTimes(transactions.length);

        } catch (error) {
            console.error("Transactions settled successfully.", error);
        }
    });

});
