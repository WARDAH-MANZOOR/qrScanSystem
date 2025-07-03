import reportSErvice from "../../../dist/services/reports/excel";
import prisma from "../../../dist/prisma/client.js";

describe("generateExcelReportService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should fetch merchants, transactions, and disbursements from the database", async () => {
        prisma.merchant.findMany = jest.fn().mockResolvedValue([{ 
            merchant_id: 1, 
            full_name: "Test Merchant",
            commissions: [{
                commissionMode: "SINGLE",
                commissionRate: 0.02,
                easypaisaRate: 0.03,
                commissionGST: 0.01,
                commissionWithHoldingTax: 0.005,
                disbursementRate: 0.015,
                disbursementGST: 0.005,
                disbursementWithHoldingTax: 0.002,
            }],
        }]);
        
        prisma.transaction.findMany = jest.fn().mockResolvedValue([
            {
                merchant_id: 1,
                original_amount: 1000,
                providerDetails: { name: "Easypaisa" },
                date_time: new Date(),
            },
        ]);

        prisma.disbursement.findMany = jest.fn().mockResolvedValue([
            {
                merchant_id: 1,
                transactionAmount: 500,
                disbursementDate: new Date(),
            },
        ]);

        await reportSErvice.generateExcelReportService();

        expect(prisma.merchant.findMany).toHaveBeenCalled();
        expect(prisma.transaction.findMany).toHaveBeenCalled();
        expect(prisma.disbursement.findMany).toHaveBeenCalled();
    });

    it("should correctly process and calculate commissions", async () => {
        prisma.merchant.findMany = jest.fn().mockResolvedValue([{ 
            merchant_id: 1, 
            full_name: "Test Merchant",
            commissions: [{
                commissionMode: "SINGLE",
                commissionRate: 0.02,
                commissionGST: 0.01,
                commissionWithHoldingTax: 0.005,
                disbursementRate: 0.015,
                disbursementGST: 0.005,
                disbursementWithHoldingTax: 0.002,
            }],
        }]);

        prisma.transaction.findMany = jest.fn().mockResolvedValue([
            {
                merchant_id: 1,
                original_amount: 1000,
                providerDetails: { name: "Easypaisa" },
                date_time: new Date(),
            },
        ]);
        prisma.disbursement.findMany = jest.fn().mockResolvedValue([
            {
                merchant_id: 1,
                transactionAmount: 500,
                disbursementDate: new Date(),
            },
        ]);

        const workbook = await reportSErvice.generateExcelReportService();
        expect(workbook).toBeInstanceOf(ExcelJS.Workbook);
    });

    it("should handle cases where no transactions or disbursements exist", async () => {
        prisma.merchant.findMany = jest.fn().mockResolvedValue([{ 
            merchant_id: 1, 
            full_name: "Test Merchant",
            commissions: [{
                commissionMode: "SINGLE",
                commissionRate: 0.02,
                commissionGST: 0.01,
                commissionWithHoldingTax: 0.005,
                disbursementRate: 0.015,
                disbursementGST: 0.005,
                disbursementWithHoldingTax: 0.002,
            }],
        }]);

        prisma.transaction.findMany = jest.fn().mockResolvedValue([]);
        prisma.disbursement.findMany = jest.fn().mockResolvedValue([]);

        const workbook = await reportSErvice.generateExcelReportService();
        expect(workbook).toBeInstanceOf(ExcelJS.Workbook);
    });
});
