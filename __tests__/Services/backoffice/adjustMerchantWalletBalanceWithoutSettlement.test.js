import prisma from "../../../dist/prisma/client.js";
import CustomError from "../../../dist/utils/custom_error.js";
import backofficeService from "../../../dist/services/backoffice/backoffice.js";
import { getWalletBalance } from '../../../dist/services/paymentGateway/disbursement.js';

jest.mock("../../../dist/prisma/client.js", () => ({
    $transaction: jest.fn()
}));

jest.mock("../../../dist/services/paymentGateway/disbursement.js", () => ({
    getWalletBalance: jest.fn()
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
describe("adjustMerchantWalletBalanceWithoutSettlement", () => {
    const merchantId = 123;

    it("should successfully adjust the wallet balance", async () => {
        getWalletBalance.mockResolvedValue({ walletBalance: 100 });

        prisma.$transaction.mockImplementation(async (callback) => {
            return callback({
                transaction: {
                    updateMany: jest.fn().mockResolvedValue({ count: 1 })
                }
            });
        });
        try {
            const result = backofficeService.adjustMerchantWalletBalanceWithoutSettlement(merchantId, 200, null, null);

            expect(result).toEqual({
                success: true,
                type: "settlement",
                previousBalance: 100,
                newBalance: 200,
                difference: 100
            });
    
            expect(prisma.$transaction).toHaveBeenCalledTimes(1);
            expect(getWalletBalance).toHaveBeenCalledWith(merchantId);

        } catch (error) {
            console.error("Function Error:", error);
        }
    });


    it("should throw an error when wallet balance is 0", async () => {
        getWalletBalance.mockResolvedValue({ walletBalance: 0 });

        await expect(
            backofficeService.adjustMerchantWalletBalanceWithoutSettlement(merchantId, 200, null, null)
        ).rejects.toThrow("Current balance is 0");

        expect(getWalletBalance).toHaveBeenCalledWith(merchantId);
    });

    it("should correctly classify as disbursement when targetBalance is lower", async () => {
        getWalletBalance.mockResolvedValue({ walletBalance: 300 });

        prisma.$transaction.mockImplementation(async (callback) => {
            return callback({
                transaction: {
                    updateMany: jest.fn().mockResolvedValue({ count: 1 })
                }
            });
        });
        try {
            const result = backofficeService.adjustMerchantWalletBalanceWithoutSettlement(merchantId, 200, null, null);

            expect(result).toEqual({
                success: true,
                type: "disbursement",
                previousBalance: 300,
                newBalance: 200,
                difference: 100
            });
    
            expect(prisma.$transaction).toHaveBeenCalledTimes(1);
            expect(getWalletBalance).toHaveBeenCalledWith(merchantId);


        } catch (error) {
            console.error("Function Error:", error);
        }
    });


    it("should throw a CustomError when Prisma transaction fails", async () => {
        getWalletBalance.mockResolvedValue({ walletBalance: 100 });
        prisma.$transaction.mockRejectedValue(new CustomError("Database transaction error"));
        try {
            const result = await backofficeService.adjustMerchantWalletBalanceWithoutSettlement(merchantId, 200, null, null)
            expect(prisma.$transaction).toHaveBeenCalledTimes(1);
            expect(getWalletBalance).toHaveBeenCalledWith(merchantId);


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
            const result = await adjustMerchantWalletBalanceWithoutSettlement(merchantId, 200, null, null);

            expect(updateManyMock).toHaveBeenCalledWith({
                where: {
                    merchant_id: merchantId,
                    status: "completed",
                    settlement: true,
                    balance: { gt: 0 },
                },
                data: {
                    balance: { multiply: 2 } // 200 / 100 = 2
                }
            });
    
            expect(prisma.$transaction).toHaveBeenCalledTimes(1);
            expect(getWalletBalance).toHaveBeenCalledWith(merchantId);


        } catch (error) {
            console.error("Function Error:", error);
        }
    });
});
