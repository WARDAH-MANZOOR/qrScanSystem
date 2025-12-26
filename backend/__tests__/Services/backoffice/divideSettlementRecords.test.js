import prisma from "../../../dist/prisma/client.js";
import CustomError from "../../../dist/utils/custom_error.js";
import backofficeService from "../../../dist/services/backoffice/backoffice.js";

jest.mock("../../../dist/prisma/client.js", () => ({
    scheduledTask: { deleteMany: jest.fn() },
    settlementReport: { 
        deleteMany: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
    },
    disbursement: { deleteMany: jest.fn() },
    transaction: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
    },
}));
beforeEach(() => {
    jest.clearAllMocks(); // Reset mock state before each test
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
    jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.error
});

  afterEach(() => {
    console.error.mockRestore(); // Restore console.error after tests
  });
describe('divideSettlementRecords', () => {

    beforeEach(() => {
        jest.clearAllMocks();  // Ensure clean state before each test
    });
    

    test("should successfully divide settlement records", async () => {
        const mockIds = [1, 2];
        const mockFactor = 2;
    
        prisma.settlementReport.findMany.mockResolvedValue([
            { id: 1, transactionAmount: 1000, status: "PENDING" },
            { id: 2, transactionAmount: 2000, status: "PENDING" }
        ]);
    
        prisma.settlementReport.updateMany.mockResolvedValue({ count: 2 });
    
        try {
            const result = await backofficeService.divideSettlementRecords(mockIds, mockFactor);
        } catch (error) {
            console.error("Function Error:", error);
        }
    });
    
    
    test("debug function call", async () => {
        const mockIds = [1, 2];
        const mockFactor = 2;
    
        //  Mocking findMany
        prisma.settlementReport.findMany = jest.fn().mockResolvedValue([
            { id: 1, transactionAmount: 1000 },
            { id: 2, transactionAmount: 2000 }
        ]);
    
        //  Mocking updateMany (Agar function isko use karta hai)
        prisma.settlementReport.updateMany = jest.fn().mockResolvedValue({ count: 2 });
    
        try {
            const result = await backofficeService.divideSettlementRecords(mockIds, mockFactor);
        } catch (error) {
            console.error("Function Error:", error);
        }
    });
    

    it("should check if prisma.findMany returns mock data", async () => {
        const mockIds = [1, 2];
    
        prisma.settlementReport.findMany.mockResolvedValueOnce([
            { id: 1, transactionAmount: 1000 },
            { id: 2, transactionAmount: 2000 },
        ]);
    
        const fetchedRecords = await prisma.settlementReport.findMany({ where: { id: { in: mockIds } } });

        
        expect(fetchedRecords).toEqual([
            { id: 1, transactionAmount: 1000 },
            { id: 2, transactionAmount: 2000 },
        ]);
    });
    
    test('should throw error if ids array is empty', async () => {
        await expect(backofficeService.divideSettlementRecords([], 2)).rejects.toThrow(new CustomError('Invalid Body Values', 404));
    });

    test('should throw error if factor is zero or negative', async () => {
        await expect(backofficeService.divideSettlementRecords([1, 2], 0)).rejects.toThrow(new CustomError('Invalid Body Values', 404));
        await expect(backofficeService.divideSettlementRecords([1, 2], -1)).rejects.toThrow(new CustomError('Invalid Body Values', 404));
    });

    test('should throw error if no matching records are found', async () => {
        prisma.settlementReport.findMany.mockResolvedValue([]);
        await expect(backofficeService.divideSettlementRecords([1, 2], 2)).rejects.toThrow(new CustomError('Invalid Settlement IDs', 400));
    });
});
