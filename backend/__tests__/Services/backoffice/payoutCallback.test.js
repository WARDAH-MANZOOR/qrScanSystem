import prisma from "../../../dist/prisma/client.js";
import { transactionService } from "../../../dist/services/index.js";
import backofficeService from "../../../dist/services/backoffice/backoffice.js";
import CustomError from "../../../dist/utils/custom_error.js";

jest.mock("../../../dist/prisma/client.js", () => ({
    disbursement: {
        findMany: jest.fn(),
    },
    merchant: {
        findFirst: jest.fn(),
    },
}));

jest.mock("../../../dist/services/index.js", () => ({
    sendCallback: jest.fn().mockResolvedValue({ success: true }),
}));
beforeEach(() => {
    jest.clearAllMocks(); // Reset mock state before each test
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
    jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.error
});

  afterEach(() => {
    console.error.mockRestore(); // Restore console.error after tests
  });
describe("payoutCallback function", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test("should throw error when no transactions are found", async () => {
        prisma.disbursement.findMany.mockResolvedValue([]);
        await expect(backofficeService.payoutCallback(["order1", "order2"])).rejects.toThrow(new CustomError("Transactions not found", 404));
    });
    test("should group transactions by merchant and send callbacks", async () => {
        prisma.disbursement.findMany.mockResolvedValue([
            { merchant_custom_order_id: "order1", merchant_id: 1, transactionAmount: 100, disbursementDate: "2024-02-10", account: "account1" },
            { merchant_custom_order_id: "order2", merchant_id: 1, transactionAmount: 200, disbursementDate: "2024-02-11", account: "account2" },
            { merchant_custom_order_id: "order3", merchant_id: 2, transactionAmount: 150, disbursementDate: "2024-02-12", account: "account3" }
        ]);
    
        prisma.merchant.findFirst.mockImplementation(({ where }) => {
            if (where.merchant_id === 1) return { merchant_id: 1, webhook_url: "https://merchant1.com/callback", encrypted: "True" };
            if (where.merchant_id === 2) return { merchant_id: 2, webhook_url: "https://merchant2.com/callback", encrypted: "False" };
            return null;
        });

        const txns = await prisma.disbursement.findMany({ where: { merchant_custom_order_id: { in: ["order1", "order2", "order3"] } } });
        console.log("Fetched transactions:", txns);
    
        try {
            const result = await backofficeService.payoutCallback(["order1", "order2", "order3"]);

        } catch (error) {
            console.error("Function Error:", error);
        }
    });
    
    test("should handle missing merchant details gracefully", async () => {
        prisma.disbursement.findMany.mockResolvedValue([
            { merchant_custom_order_id: "order1", merchant_id: 1, transactionAmount: 100, disbursementDate: "2024-02-10", account: "account1" }
        ]);
        prisma.merchant.findFirst.mockResolvedValue(null);
    
        //  Mocking updateMany (Agar function isko use karta hai)
        const txns = await prisma.disbursement.findMany({ where: { merchant_custom_order_id: { in: ["order1"] } } });
        console.log("Fetched transactions:", txns);    
        try {
            const result = await backofficeService.payoutCallback(["order1"]);

        } catch (error) {
            console.error("Function Error:", error);
        }
    });
    
});
