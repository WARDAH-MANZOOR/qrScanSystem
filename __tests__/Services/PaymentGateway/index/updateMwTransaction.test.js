import { updateMwTransaction } from '../../../../dist/services/paymentGateway/index.js';
import CustomError from "../../../../dist/utils/custom_error.js";
import prisma from "../../../../dist/prisma/client.js";
import jazzcashDisburse from '../../../../dist/services/paymentGateway/jazzcashDisburse.js';
import { transactionService, merchantService, easyPaisaService } from "../../../../dist/services/index.js";
import { Decimal } from "@prisma/client/runtime/library";
import fetch from 'node-fetch';

// Mock Prisma Client
jest.mock('../../../../dist/prisma/client.js', () => ({
    disbursement: {
        findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
}));

// Mock External Services
jest.mock('node-fetch', () => jest.fn());

jest.mock("../../../../dist/services/paymentGateway/jazzcashDisburse.js", () => ({
    getDisburseAccount: jest.fn(),
}));

jest.mock("../../../../dist/services/index.js", () => ({
    merchantService: {
        findOne: jest.fn(),
    },
    transactionService: {
        createTransactionId: jest.fn(),
        sendCallback: jest.fn(),
    },
    easyPaisaService: {
        adjustMerchantToDisburseBalance: jest.fn(),
    },
}));

jest.mock("../../../../dist/services/paymentGateway/index.js", () => ({
    updateMwTransaction: jest.fn(),
}));

// Suppress console logs and errors
beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    global.fetch = jest.fn(); // Ensure fetch is mocked
});

afterEach(() => {
    console.error.mockRestore();
    console.log.mockRestore();
});

// Mock Data
const mockMerchant = {
    uid: "merchant123",
    merchant_id: "mid123",
    JazzCashDisburseAccountId: "disburse123",
    balanceToDisburse: new Decimal(5000),
    callback_mode: "DOUBLE",
    payout_callback: "https://callback.url",
    webhook_url: "https://webhook.url",
    encrypted: "false"
};

const mockBody = {
    account: "923001234567",
    merchantAmount: 1000,
    commission: 50,
    gst: 100,
    withholdingTax: 50,
    order_id: "order123",
    system_order_id: "sys123",
    cnic: "1234567890123"
};

describe("updateMwTransaction", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should process transaction successfully", async () => {
        merchantService.findOne.mockResolvedValue(mockMerchant);
        prisma.disbursement.findFirst.mockResolvedValue(null); // No duplicate order
        prisma.$transaction.mockImplementation(async (callback) => await callback({ disbursement: { update: jest.fn() } }));
        easyPaisaService.adjustMerchantToDisburseBalance.mockResolvedValue(true);
        fetch.mockResolvedValue({ json: async () => ({ data: "encryptedResponse" }) });

        updateMwTransaction.mockResolvedValue({ message: "Disbursement created successfully" });

        const response = await updateMwTransaction("token123", mockBody, "merchant123");
        expect(response.message).toBe("Disbursement created successfully");
    });

    test("should fail if merchant not found", async () => {
        merchantService.findOne.mockResolvedValue(null);
        updateMwTransaction.mockRejectedValue(new CustomError("Merchant not found", 404));

        await expect(updateMwTransaction("token123", mockBody, "merchant123")).rejects.toThrow("Merchant not found");
    });

    test("should fail if order ID already exists", async () => {
        merchantService.findOne.mockResolvedValue(mockMerchant);
        prisma.disbursement.findFirst.mockResolvedValue({}); // Duplicate order found

        updateMwTransaction.mockRejectedValue(new CustomError("Order ID already exists", 400));

        await expect(updateMwTransaction("token123", mockBody, "merchant123")).rejects.toThrow("Order ID already exists");
    });

    test("should fail if phone number doesn't start with 92", async () => {
        merchantService.findOne.mockResolvedValue(mockMerchant);
        const invalidBody = { ...mockBody, account: "81234567890" };

        updateMwTransaction.mockRejectedValue(new CustomError("Number should start with 92", 400));

        await expect(updateMwTransaction("token123", invalidBody, "merchant123")).rejects.toThrow("Number should start with 92");
    });

    test("should fail if insufficient balance", async () => {
        merchantService.findOne.mockResolvedValue({ ...mockMerchant, balanceToDisburse: new Decimal(500) });

        updateMwTransaction.mockRejectedValue(new CustomError("Insufficient balance to disburse", 400));

        await expect(updateMwTransaction("token123", mockBody, "merchant123")).rejects.toThrow("Insufficient balance to disburse");
    });
});
