import prisma from "../../../../dist/prisma/client.js";
import { getWalletBalance } from "../../../../dist/services/paymentGateway/disbursement.js";
import CustomError from "../../../../dist/utils/custom_error.js";
import dashboardService from "../../../../dist/services/dashboard/index.js";

jest.mock('../../../../dist/prisma/client.js', () => ({
    transaction: {
        count: jest.fn(),
        aggregate: jest.fn(),
        groupBy: jest.fn(),
        findMany: jest.fn(),
    },
}));
jest.mock("../../../../dist/services/paymentGateway/disbursement.js");
beforeEach(() => {
    jest.clearAllMocks(); // Reset mock state before each test
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
    jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.error
});

  afterEach(() => {
    console.error.mockRestore(); // Restore console.error after tests
  });
describe("merchantDashboardDetails", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should throw an error if merchantId is missing", async () => {
        const params = {};

        await expect(dashboardService.merchantDashboardDetails(params)).rejects.toThrow(
            new CustomError("Merchant ID is required", 400)
        );
    });

    it("should handle no transactions found", async () => {
        const params = {
            merchantId: 123,
        };

        prisma.transaction.count.mockResolvedValue(0);
        prisma.transaction.aggregate.mockResolvedValue({ _sum: { original_amount: null } });
        prisma.transaction.groupBy.mockResolvedValue([]);
        prisma.transaction.findMany.mockResolvedValue([]);
        getWalletBalance.mockResolvedValue({ walletBalance: 0 });

        const result = await dashboardService.merchantDashboardDetails(params);

        expect(result).toEqual({
            totalTransactions: 0,
            totalIncome: 0,
            todayIncome: 0,
            statusCounts: [
                { status: "completed", count: 0 },
                { status: "pending", count: 0 },
                { status: "failed", count: 0 },
            ],
            latestTransactions: [],
            availableBalance: 0,
            transactionSuccessRate: 0,
            lastWeek: 0,
            thisWeek: 0,
            easyPaisaCount: 0,    // Added fields for easyPaisa and jazzCash counts
            easyPaisaTotal: 0,
            jazzCashCount: 0,
            jazzCashTotal: 0,
        });
    });

    it("should return 0 for each status type when no transactions are found", async () => {
        const params = {
            merchantId: 123,
        };

        prisma.transaction.groupBy.mockResolvedValue([]);

        const result = await dashboardService.merchantDashboardDetails(params);

        expect(result.statusCounts).toEqual([
            { status: "completed", count: 0 },
            { status: "pending", count: 0 },
            { status: "failed", count: 0 },
        ]);
    });

    it("should return a success rate of 0 when no completed transactions are found", async () => {
        const params = { merchantId: 123 };

        prisma.transaction.groupBy.mockResolvedValue([
            { status: "pending", _count: { status: 5 } },
            { status: "failed", _count: { status: 5 } },
        ]);

        const result = await dashboardService.merchantDashboardDetails(params);

        expect(result.transactionSuccessRate).toBe(0);
    });
  
});
