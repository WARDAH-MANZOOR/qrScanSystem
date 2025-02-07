import prisma from "../../../dist/prisma/client.js";
import CustomError from "../../../dist/utils/custom_error.js";
import backofficeService from "../../../dist/services/backoffice/backoffice.js";
import { getWalletBalance } from '../../../dist/services/paymentGateway/disbursement.js';

import { format } from "date-fns";

jest.mock("../../../dist/prisma/client.js", () => ({
    __esModule: true,
    default: {
        $transaction: jest.fn(),
        transaction: { updateMany: jest.fn() },
        settlementReport: { create: jest.fn() },
        disbursement: { create: jest.fn() },
        merchant: { findUnique: jest.fn() },  // Mocking merchant existence
    },
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

describe("adjustMerchantWalletBalance", () => {
    const merchantId = 123; // Ensure merchantId is an integer
    const targetBalance = 500;
    const initialBalance = 1000;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('adjustMerchantWalletBalance should update transactions correctly', async () => {
        getWalletBalance.mockResolvedValue({ walletBalance: 1000 });
        prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
        prisma.transaction.updateMany.mockResolvedValue({ count: 1 });
        prisma.settlementReport.create.mockResolvedValue({});

        const result = await backofficeService.adjustMerchantWalletBalance(123, 500, true, false);
        expect(result).toEqual({
            success: true,
            type: 'disbursement',
            previousBalance: 1000,
            newBalance: 500,
            difference: 500
        });
    });

    test('adjustMerchantWalletBalance should create settlement record', async () => {
        getWalletBalance.mockResolvedValue({ walletBalance: 500 });
        prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
        prisma.transaction.updateMany.mockResolvedValue({ count: 1 });
        prisma.settlementReport.create.mockResolvedValue({});

        const result = await backofficeService.adjustMerchantWalletBalance(123, 1000, true, false);
        expect(prisma.settlementReport.create).toHaveBeenCalled();
        expect(result.type).toBe('settlement');
    });

    test('adjustMerchantWalletBalance should create disbursement record', async () => {
        getWalletBalance.mockResolvedValue({ walletBalance: 1000 });
        prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
        prisma.transaction.updateMany.mockResolvedValue({ count: 1 });
        prisma.disbursement.create.mockResolvedValue({});

        const result = await backofficeService.adjustMerchantWalletBalance(123, 500, true, false);
        expect(prisma.disbursement.create).toHaveBeenCalled();
        expect(result.type).toBe('disbursement');
    });

    test('adjustMerchantWalletBalance should throw error on database failure', async () => {
        getWalletBalance.mockResolvedValue({ walletBalance: 1000 });
        prisma.$transaction.mockRejectedValue(new Error('DB Error'));

        await expect(backofficeService.adjustMerchantWalletBalance(123, 500, true, false)).rejects.toThrow('Failed to adjust wallet balance');
    });

    test("should throw an error when wallet balance is 0", async () => {
        getWalletBalance.mockResolvedValue({ walletBalance: 0 });

        await expect(backofficeService.adjustMerchantWalletBalance(merchantId, targetBalance, true))
            .rejects.toThrow("Current balance is 0");
    });
});
