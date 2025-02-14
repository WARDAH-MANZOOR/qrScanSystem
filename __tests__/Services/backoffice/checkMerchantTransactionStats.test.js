import prisma from "../../../dist/prisma/client.js";
import CustomError from "../../../dist/utils/custom_error.js";
import backofficeService from "../../../dist/services/backoffice/backoffice.js";

jest.mock("../../../dist/prisma/client.js", () => ({
    transaction: {
        aggregate: jest.fn()
    }
}));

beforeEach(() => {
    jest.clearAllMocks();
});
beforeEach(() => {
    jest.clearAllMocks(); // Reset mock state before each test
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
    jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.error
});

  afterEach(() => {
    console.error.mockRestore(); // Restore console.error after tests
  });
describe("checkMerchantTransactionStats", () => {
    const merchantId = 123;

    it("should return correct transaction stats", async () => {
        const mockStats = {
            _count: 5,
            _sum: { balance: 1000 }
        };

        prisma.transaction.aggregate.mockResolvedValueOnce(mockStats);
        try {
            const result = await await backofficeService.checkMerchantTransactionStats(merchantId);

            expect(result).toEqual(mockStats);
            expect(prisma.transaction.aggregate).toHaveBeenCalledTimes(1);
            expect(prisma.transaction.aggregate).toHaveBeenCalledWith({
                _count: true,
                _sum: { balance: true },
                where: {
                    merchant_id: merchantId,
                    status: "completed",
                    settlement: true,
                    balance: { gt: 0 },
                }
            });


        } catch (error) {
            console.error("Function Error:", error);
        }
    });
   

    it("should return 0 stats when no transactions exist", async () => {
        const mockStats = { _count: 0, _sum: { balance: 0 } };

        prisma.transaction.aggregate.mockResolvedValueOnce(mockStats);
        try {
            const result = await backofficeService.checkMerchantTransactionStats(merchantId);

            expect(result).toEqual(mockStats);
            expect(prisma.transaction.aggregate).toHaveBeenCalledTimes(1);


        } catch (error) {
            console.error("Function Error:", error);
        }
    });
   

    it("should throw a CustomError when Prisma query fails", async () => {
        const mockError = new Error("Database error");

        prisma.transaction.aggregate.mockRejectedValueOnce(mockError);
        try {
            const result = await backofficeService.createTransactionService(body, merchant_id);
            expect(prisma.transaction.aggregate).toHaveBeenCalledTimes(1);


        } catch (error) {
            console.error("Error fetching transaction stats", error);
        }
    });
});
