import transactionsCreateService from "../../../../dist/services/transactions/create.js"; // Adjust the import path based on your project structure

describe("calculateSettledAmount", () => {
    it("should correctly calculate the settled amount when commissionPercentage is valid", () => {
        const originalAmount = 1000;
        const commissionPercentage = 0.1; // 10%

        const expectedSettledAmount = 1000 * (1 - 0.1); // 1000 * 0.9 = 900

        const result = transactionsCreateService.calculateSettledAmount(originalAmount, commissionPercentage);

        expect(result).toBe(expectedSettledAmount);
    });

    it("should return the original amount if commissionPercentage is 0", () => {
        const originalAmount = 1000;
        const commissionPercentage = 0;

        const expectedSettledAmount = 1000 * (1 - 0); // 1000 * 1 = 1000

        const result = transactionsCreateService.calculateSettledAmount(originalAmount, commissionPercentage);

        expect(result).toBe(expectedSettledAmount);
    });

    it("should return 0 if commissionPercentage is 1 (100%)", () => {
        const originalAmount = 1000;
        const commissionPercentage = 1; // 100%

        const expectedSettledAmount = 1000 * (1 - 1); // 1000 * 0 = 0

        const result = transactionsCreateService.calculateSettledAmount(originalAmount, commissionPercentage);

        expect(result).toBe(expectedSettledAmount);
    });

    it("should handle large commissionPercentage values correctly", () => {
        const originalAmount = 1000;
        const commissionPercentage = 0.9; // 90%

        const expectedSettledAmount = 1000 * (1 - 0.9); // 1000 * 0.1 = 100

        const result = transactionsCreateService.calculateSettledAmount(originalAmount, commissionPercentage);

        expect(result).toBe(expectedSettledAmount);
    });

    it("should handle negative commissionPercentage values correctly", () => {
        const originalAmount = 1000;
        const commissionPercentage = -0.1; // -10%

        const expectedSettledAmount = 1000 * (1 - (-0.1)); // 1000 * 1.1 = 1100

        const result = transactionsCreateService.calculateSettledAmount(originalAmount, commissionPercentage);

        expect(result).toBe(expectedSettledAmount);
    });

    it("should return 0 for negative originalAmount", () => {
        const originalAmount = -1000;
        const commissionPercentage = 0.1; // 10%

        const expectedSettledAmount = -1000 * (1 - 0.1); // -1000 * 0.9 = -900

        const result = transactionsCreateService.calculateSettledAmount(originalAmount, commissionPercentage);

        expect(result).toBe(expectedSettledAmount);
    });

    it("should return 0 for zero originalAmount", () => {
        const originalAmount = 0;
        const commissionPercentage = 0.1; // 10%

        const expectedSettledAmount = 0 * (1 - 0.1); // 0 * 0.9 = 0

        const result = transactionsCreateService.calculateSettledAmount(originalAmount, commissionPercentage);

        expect(result).toBe(expectedSettledAmount);
    });
});
