import { parseISO } from "date-fns";
import { Parser } from "json2csv";
import prisma from "../../../../dist/prisma/client.js";
import easyPaisaService from "../../../../dist/services/paymentGateway/easypaisa.js";

jest.mock("../../../../dist/prisma/client.js", () => ({
    merchant: {
        findFirst: jest.fn(),
        updateMany: jest.fn(),
    },
    easyPaisaMerchant: {
        findFirst: jest.fn(),
    },
    disbursement: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),  // Add this line
    },
    $transaction: jest.fn(),
}));


describe("exportDisbursement", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should return CSV data when valid disbursements exist", async () => {
        const mockDisbursements = [
            {
                merchant: { uid: 1, full_name: "Merchant A" },
                account: "123456",
                transaction_id: "TXN123",
                merchant_custom_order_id: "ORDER123",
                disbursementDate: "2024-01-01T00:00:00Z",
                transactionAmount: 100,
                commission: 5,
                gst: 2,
                withholdingTax: 1,
                merchantAmount: 92,
                status: "Success",
                provider: "BankA",
            }
        ];

        prisma.disbursement.findMany.mockResolvedValue(mockDisbursements);

        const params = {
            start: "2024-01-01",
            end: "2024-01-02",
            account: "123",
            transaction_id: "TXN",
            merchantTransactionId: "ORDER",
            status: "Success"
        };

        const csvData = await easyPaisaService.exportDisbursement(1, params);
        
        expect(prisma.disbursement.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({
                merchant_id: 1,
                disbursementDate: {
                    gte: parseISO("2024-01-01"),
                    lt: parseISO("2024-01-02")
                },
                account: expect.objectContaining({ contains: "123" }),
                transaction_id: expect.objectContaining({ contains: "TXN" }),
                merchant_custom_order_id: expect.objectContaining({ contains: "ORDER" }),
                status: "Success"
            })
        }));

        expect(csvData).toContain("\"merchant\",\"account\",\"transaction_id\",\"merchant_order_id\",\"disbursement_date\",\"transaction_amount\",\"commission\",\"gst\",\"withholding_tax\",\"merchant_amount\",\"status\",\"provider\"");
        expect(csvData).toContain("\"Merchant A\",\"123456\",\"TXN123\",\"ORDER123\",\"2024-01-01T00:00:00Z\",100,5,2,1,92,\"Success\",\"BankA\"");
    });

    it("should return empty CSV when no disbursements are found", async () => {
        prisma.disbursement.findMany.mockResolvedValue([]);

        const params = { start: "2024-01-01", end: "2024-01-02" };
        const csvData = await easyPaisaService.exportDisbursement(1, params);

        expect(csvData).toContain("\"merchant\",\"account\",\"transaction_id\",\"merchant_order_id\",\"disbursement_date\",\"transaction_amount\",\"commission\",\"gst\",\"withholding_tax\",\"merchant_amount\",\"status\",\"provider\"");
    });
});


