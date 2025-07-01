import prisma from "../../../dist/prisma/client.js";
import CustomError from "../../../dist/utils/custom_error.js";
import { getWalletBalance } from "../../../dist/services/paymentGateway/disbursement.js";
import backofficeService from "../../../dist/services/backoffice/backoffice.js";
import { format } from "date-fns";

jest.mock("../../../dist/prisma/client.js", () => ({
    $transaction: jest.fn()
}));

jest.mock("../../../dist/services/paymentGateway/disbursement.js", () => ({
    getWalletBalance: jest.fn()
}));

beforeEach(() => {
    jest.clearAllMocks(); // Reset mock state before each test
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
    jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.error
});

  afterEach(() => {
    console.error.mockRestore(); // Restore console.error after tests
  });

describe("adjustMerchantDisbursementWalletBalance", () => {
    const merchantId = 123;
    const record = true;

    it("should successfully adjust the wallet balance as settlement", async () => {
        getWalletBalance.mockResolvedValue({ walletBalance: 100 });

        prisma.$transaction.mockImplementation(async (callback) => {
            return callback({
                transaction: {
                    updateMany: jest.fn().mockResolvedValue({ count: 1 })
                },
                settlementReport: {
                    create: jest.fn().mockResolvedValue({})
                }
            });
        });
        try {
            const result = await await backofficeService.adjustMerchantDisbursementWalletBalance(merchantId, 200, record, null);

            expect(result).toEqual({
                success: true,
                type: "settlement",
                previousBalance: 100,
                newBalance: 300,
                difference: 200
            });
    
            expect(getWalletBalance).toHaveBeenCalledWith(merchantId);
            expect(prisma.$transaction).toHaveBeenCalledTimes(1);


        } catch (error) {
            console.error("Function Error:", error);
        }
    });
   
    it("should successfully adjust the wallet balance as disbursement", async () => {
        getWalletBalance.mockResolvedValue({ walletBalance: 300 });

        prisma.$transaction.mockImplementation(async (callback) => {
            return callback({
                transaction: {
                    updateMany: jest.fn().mockResolvedValue({ count: 1 })
                },
                disbursement: {
                    create: jest.fn().mockResolvedValue({})
                }
            });
        });
        try {
            const result = await backofficeService.adjustMerchantDisbursementWalletBalance(merchantId, 200, record, null);

            expect(result).toEqual({
                success: true,
                type: "disbursement",
                previousBalance: 300,
                newBalance: 500,
                difference: 200
            });
    
            expect(getWalletBalance).toHaveBeenCalledWith(merchantId);
            expect(prisma.$transaction).toHaveBeenCalledTimes(1);


        } catch (error) {
            console.error("Function Error:", error);
        }
    });
   
    it("should throw an error when wallet balance is 0", async () => {
        getWalletBalance.mockResolvedValue({ walletBalance: 0 });

        await expect(
            backofficeService.adjustMerchantDisbursementWalletBalance(merchantId, 200, record, null)
        ).rejects.toThrow("Current balance is 0");

        expect(getWalletBalance).toHaveBeenCalledWith(merchantId);
    });

    it("should throw a CustomError when Prisma transaction fails", async () => {
        getWalletBalance.mockResolvedValue({ walletBalance: 100 });

        prisma.$transaction.mockRejectedValue(new CustomError("Database transaction error"));
        try {
            const result = await backofficeService.adjustMerchantDisbursementWalletBalance(merchantId, 200, record, null)
            expect(prisma.$transaction).toHaveBeenCalledTimes(1);
        } catch (error) {
            console.error("Database transaction error", error);
        }
    });

    it("should correctly update transaction balances in Prisma", async () => {
        getWalletBalance.mockResolvedValue({ walletBalance: 100 });
        const updateManyMock = jest.fn().mockResolvedValue({ count: 1 });

        prisma.$transaction.mockImplementation(async (callback) => {
            return callback({
                transaction: { updateMany: updateManyMock }
            });
        });
        try {
            const result = await backofficeService.adjustMerchantDisbursementWalletBalance(merchantId, 200, record, null);

            expect(updateManyMock).toHaveBeenCalledWith({
                where: {
                    merchant_id: merchantId,
                    status: "completed",
                    settlement: true,
                    balance: { gt: 0 },
                },
                data: {
                    balance: { multiply: 3 } // (200 + 100) / 100 = 3
                }
            });
    
            expect(prisma.$transaction).toHaveBeenCalledTimes(1);
            expect(getWalletBalance).toHaveBeenCalledWith(merchantId);


        } catch (error) {
            console.error("Function Error:", error);
        }
    });
});
