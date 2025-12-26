import dashboardService from "../../../../dist/services/dashboard/index.js";

describe("getTransactionsSuccessRate", () => {

    // Test Case 1: Success Rate Calculation with Valid Status Counts
    it("should calculate the success rate correctly when there are valid status counts", async () => {
        const statusCounts = [
            { status: "completed", _count: { status: 50 } },
            { status: "pending", _count: { status: 30 } },
            { status: "failed", _count: { status: 20 } },
        ];

        const successRate = await dashboardService.getTransactionsSuccessRate(statusCounts);

        expect(successRate).toBe(50); // 50/100 * 100 = 50% success rate
    });

    // Test Case 2: Success Rate Calculation When No Successful Transactions
    it("should return 0% success rate when there are no successful transactions", async () => {
        const statusCounts = [
            { status: "pending", _count: { status: 30 } },
            { status: "failed", _count: { status: 20 } },
        ];

        const successRate = await dashboardService.getTransactionsSuccessRate(statusCounts);

        expect(successRate).toBe(0); // 0/50 * 100 = 0% success rate
    });

    // Test Case 3: Success Rate Calculation with No Transactions
    it("should return 0% success rate when there are no transactions", async () => {
        const statusCounts = [];

        const successRate = await dashboardService.getTransactionsSuccessRate(statusCounts);

        expect(successRate).toBe(0); // No transactions, success rate is 0
    });

    // Test Case 4: Success Rate Calculation with Only Completed Transactions
    it("should return 100% success rate when all transactions are successful", async () => {
        const statusCounts = [
            { status: "completed", _count: { status: 50 } },
        ];

        const successRate = await dashboardService.getTransactionsSuccessRate(statusCounts);

        expect(successRate).toBe(100); // 50/50 * 100 = 100% success rate
    });

    // Test Case 5: Success Rate Calculation When "completed" Status Is Missing
    it("should return 0% success rate when the completed status is missing", async () => {
        const statusCounts = [
            { status: "pending", _count: { status: 30 } },
            { status: "failed", _count: { status: 20 } },
        ];

        const successRate = await dashboardService.getTransactionsSuccessRate(statusCounts);

        expect(successRate).toBe(0); // 0/50 * 100 = 0% success rate
    });

});
