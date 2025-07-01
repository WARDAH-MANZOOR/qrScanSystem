import prisma from "../../../dist/prisma/client.js";
import { transactionService } from "../../../dist/services/index.js";
import backofficeService from "../../../dist/services/backoffice/backoffice.js";
import CustomError from "../../../dist/utils/custom_error.js";

// Mock Prisma database queries
jest.mock("../../../dist/prisma/client.js", () => ({
    disbursement: {
        findMany: jest.fn(),
    },
    merchant: {
        findFirst: jest.fn(),
    },
    transaction: {
        findMany: jest.fn(),
    }
}));

// Corrected: Mock transactionService with sendCallback inside
jest.mock("../../../dist/services/index.js", () => ({
    transactionService: {
        sendCallback: jest.fn()
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

describe("payinCallback function", () => {
    test("should throw error when no transactions are found", async () => {
        prisma.transaction.findMany.mockResolvedValue([]);
    
        // Spy on console.log to check if the error message was logged
        const consoleSpy = jest.spyOn(console, 'log');
    
        await backofficeService.payinCallback(["order1", "order2", "order3"]);
    
        expect(consoleSpy).toHaveBeenCalledWith(new CustomError("Transactions not found", 404));
    });
    

    test("should group transactions by merchant and send callbacks", async () => {
        prisma.transaction.findMany.mockResolvedValue([
            { merchant_transaction_id: "order1", merchant_id: 1, providerDetails: { account: "account1" } },
            { merchant_transaction_id: "order2", merchant_id: 1, providerDetails: { account: "account2" } },
            { merchant_transaction_id: "order3", merchant_id: 2, providerDetails: { account: "account3" } }
        ]);
    
        prisma.merchant.findFirst.mockImplementation(({ where }) => {
            if (where.merchant_id === 1) return { merchant_id: 1, webhook_url: "https://merchant1.com/callback", encrypted: "True" };
            if (where.merchant_id === 2) return { merchant_id: 2, webhook_url: "https://merchant2.com/callback", encrypted: "False" };
            return null;
        });

        const txns = await prisma.disbursement.findMany({ where: { merchant_transaction_id: { in: ["order1", "order2", "order3"] } } });
        console.log("Fetched transactions:", txns);
    
        try {
            const result = await backofficeService.payinCallback(["order1", "order2", "order3"]);


        } catch (error) {
            console.error("Function Error:", error);
        }
    });
    test("should handle missing merchant details gracefully", async () => {
        prisma.transaction.findMany.mockResolvedValue([
            { merchant_transaction_id: "order1", merchant_id: 1, providerDetails: { account: "account1" } }
        ]);
       
        prisma.merchant.findFirst.mockResolvedValue(null);    
        //  Mocking updateMany (Agar function isko use karta hai)
        const txns = await prisma.disbursement.findMany({ where: { merchant_transaction_id: { in: ["order1"] } } });
        console.log("Fetched transactions:", txns);    
        try {
            const result = await backofficeService.payinCallback(["order1"]);

        } catch (error) {
            console.error("Function Error:", error);
        }
    });
});
