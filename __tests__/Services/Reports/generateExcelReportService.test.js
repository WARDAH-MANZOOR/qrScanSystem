import ReportServices from "../../../dist/services/reports/excel.js";
import prisma from "../../../dist/prisma/client.js";
import ExcelJS from "exceljs";

describe("generateExcelReportService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    
    it("should fetch merchants, transactions, and disbursements from the database", async () => {
        prisma.merchant.findMany = jest.fn().mockResolvedValue([]);
        prisma.transaction.findMany = jest.fn().mockResolvedValue([]);
        prisma.disbursement.findMany = jest.fn().mockResolvedValue([]);
        
        await ReportServices.generateExcelReportService();
        
        expect(prisma.merchant.findMany).toHaveBeenCalled();
        expect(prisma.transaction.findMany).toHaveBeenCalled();
        expect(prisma.disbursement.findMany).toHaveBeenCalled();
    });

    it("should process data correctly when transactions and disbursements exist", async () => {
        prisma.merchant.findMany = jest.fn().mockResolvedValue([
            {
                merchant_id: 1,
                full_name: "Test Merchant",
                commissions: [
                    {
                        commissionMode: "SINGLE",
                        commissionRate: 0.05,
                        easypaisaRate: 0.03,
                        commissionGST: 0.02,
                        commissionWithHoldingTax: 0.01,
                        disbursementRate: 0.04,
                        disbursementGST: 0.02,
                        disbursementWithHoldingTax: 0.01,
                    },
                ],
            },
        ]);
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
        
        const workbook = await ReportServices.generateExcelReportService();
        expect(workbook).toBeInstanceOf(ExcelJS.Workbook);
    });
    
    it("should generate an Excel report with correct headers", async () => {
        prisma.merchant.findMany = jest.fn().mockResolvedValue([
            { merchant_id: 1, full_name: "Merchant A", commissions: [] },
        ]);
        prisma.transaction.findMany = jest.fn().mockResolvedValue([]);
        prisma.disbursement.findMany = jest.fn().mockResolvedValue([]);
        
        const workbook = await ReportServices.generateExcelReportService();
        const sheet = workbook.getWorksheet("Merchant Report");
        
        expect(sheet).toBeDefined();
        expect(sheet.getRow(1).getCell(1).value).toBe("Merchant Name");
    });
});
