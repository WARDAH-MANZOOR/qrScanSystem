import prisma from "../../../../dist/prisma/client.js";
import dashboardService from "../../../../dist/services/dashboard/index.js"; // Replace with the correct import path
import CustomError from "../../../../dist/utils/custom_error.js";
beforeEach(() => {
    jest.clearAllMocks(); // Reset mock state before each test
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
    jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.error
});

  afterEach(() => {
    console.error.mockRestore(); // Restore console.error after tests
  });
describe("adminDashboardDetails", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should return the correct dashboard summary for valid parameters", async () => {
        const params = {
            start: "2025-01-01T00:00:00+00:00",
            end: "2025-01-02T00:00:00+00:00",
        };

        const totalMerchantsMock = 5;
        const totalIncomeMock = { _sum: { original_amount: 1000 } };
        const todayIncomeMock = { _sum: { original_amount: 200 } };
        const latestTransactionsMock = [
            { id: 1, date_time: new Date(), Provider: { name: "Provider1" } },
            { id: 2, date_time: new Date(), Provider: { name: "Provider2" } },
        ];

        prisma.merchant.count = jest.fn().mockResolvedValue(totalMerchantsMock);
        prisma.transaction.aggregate = jest
            .fn()
            .mockResolvedValueOnce(totalIncomeMock)
            .mockResolvedValueOnce(todayIncomeMock);
        prisma.transaction.findMany = jest
            .fn()
            .mockResolvedValue(latestTransactionsMock);

        const result = await dashboardService.adminDashboardDetails(params);

        expect(result).toEqual({
            totalMerchants: totalMerchantsMock,
            totalIncome: totalIncomeMock._sum.original_amount,
            todayIncome: todayIncomeMock._sum.original_amount,
            latestTransactions: latestTransactionsMock,
        });
        expect(prisma.merchant.count).toHaveBeenCalledTimes(1);
        expect(prisma.transaction.aggregate).toHaveBeenCalledTimes(2);
        expect(prisma.transaction.findMany).toHaveBeenCalledTimes(1);
    });

    it("should handle missing start and end date parameters", async () => {
        const params = {};

        const totalMerchantsMock = 10;
        const totalIncomeMock = { _sum: { original_amount: 5000 } };
        const todayIncomeMock = { _sum: { original_amount: 300 } };
        const latestTransactionsMock = [];

        prisma.merchant.count = jest.fn().mockResolvedValue(totalMerchantsMock);
        prisma.transaction.aggregate = jest
            .fn()
            .mockResolvedValueOnce(totalIncomeMock)
            .mockResolvedValueOnce(todayIncomeMock);
        prisma.transaction.findMany = jest.fn().mockResolvedValue(latestTransactionsMock);

        const result = await dashboardService.adminDashboardDetails(params);

        expect(result).toEqual({
            totalMerchants: totalMerchantsMock,
            totalIncome: totalIncomeMock._sum.original_amount,
            todayIncome: todayIncomeMock._sum.original_amount,
            latestTransactions: latestTransactionsMock,
        });
    });

    it("should throw a CustomError if an aggregate query fails", async () => {
        const params = {
            start: "2025-01-01T00:00:00+00:00",
            end: "2025-01-02T00:00:00+00:00",
        };

        prisma.merchant.count = jest.fn().mockResolvedValue(5);
        prisma.transaction.aggregate = jest.fn().mockRejectedValue(new Error("Database error"));

        await expect(dashboardService.adminDashboardDetails(params)).rejects.toThrow(CustomError);
    });

    it("should return default values if no transactions are found", async () => {
        const params = {
            start: "2025-01-01T00:00:00+00:00",
            end: "2025-01-02T00:00:00+00:00",
        };

        prisma.merchant.count = jest.fn().mockResolvedValue(0);
        prisma.transaction.aggregate = jest
            .fn()
            .mockResolvedValueOnce({ _sum: { original_amount: null } })
            .mockResolvedValueOnce({ _sum: { original_amount: null } });
        prisma.transaction.findMany = jest.fn().mockResolvedValue([]);

        const result = await dashboardService.adminDashboardDetails(params);

        expect(result).toEqual({
            totalMerchants: 0,
            totalIncome: 0,
            todayIncome: 0,
            latestTransactions: [],
        });
    });
});
