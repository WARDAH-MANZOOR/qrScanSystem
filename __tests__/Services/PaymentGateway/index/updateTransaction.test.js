import { updateTransaction } from '../../../../dist/services/paymentGateway/index.js';
import CustomError from "../../../../dist/utils/custom_error.js";
import prisma from "../../../../dist/prisma/client.js";
import jazzcashDisburse from '../../../../dist/services/paymentGateway/jazzcashDisburse.js';
import { transactionService, merchantService, easyPaisaService } from "../../../../dist/services/index.js";
import { Decimal } from "@prisma/client/runtime/library";

jest.mock('../../../../dist/prisma/client.js', () => ({
    disbursement: {
        findFirst: jest.fn(),
    },
}));

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
    updateTransaction: jest.fn(),
}));

beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console errors
    jest.spyOn(console, 'log').mockImplementation(() => {});   // Suppress console logs
});

afterEach(() => {
    console.error.mockRestore();
    console.log.mockRestore();
});

describe("updateTransaction function", () => {
    let token, body, merchantId;

    beforeEach(() => {
        token = "mocked-token";
        merchantId = "mocked-merchant-id";
        body = {
            order_id: "mock-order-id",
            merchantAmount: 1000,
            commission: 50,
            gst: 20,
            withholdingTax: 10,
            account: "123456789",
            to_provider: "mock-bank-code",
            system_order_id: "mock-system-order-id",
        };
    });

    it("should throw an error if merchant is not found", async () => {
        merchantService.findOne.mockResolvedValue(null);
        updateTransaction.mockRejectedValue(new CustomError("Merchant not found", 404));

        await expect(updateTransaction(token, body, merchantId)).rejects.toThrow("Merchant not found");
    });

    it("should throw an error if disbursement account is not assigned", async () => {
        merchantService.findOne.mockResolvedValue({ uid: merchantId, JazzCashDisburseAccountId: null });
        updateTransaction.mockRejectedValue(new CustomError("Disbursement account not assigned.", 400));

        await expect(updateTransaction(token, body, merchantId)).rejects.toThrow("Disbursement account not assigned.");
    });

    it("should throw an error if order ID already exists", async () => {
        merchantService.findOne.mockResolvedValue({ uid: merchantId, JazzCashDisburseAccountId: "mock-disburse-id" });
        prisma.disbursement.findFirst.mockResolvedValue({ id: "mock-order-id" });
        updateTransaction.mockRejectedValue(new CustomError("Order ID already exists", 409));

        await expect(updateTransaction(token, body, merchantId)).rejects.toThrow("Order ID already exists");
    });

    it("should throw an error if merchant has insufficient balance", async () => {
        merchantService.findOne.mockResolvedValue({
            uid: merchantId,
            JazzCashDisburseAccountId: "mock-disburse-id",
            balanceToDisburse: new Decimal(500),
        });
        prisma.disbursement.findFirst.mockResolvedValue(null);
        updateTransaction.mockRejectedValue(new CustomError("Insufficient balance to disburse", 400));

        await expect(updateTransaction(token, body, merchantId)).rejects.toThrow("Insufficient balance to disburse");
    });

    it("should return success response on successful disbursement", async () => {
        merchantService.findOne.mockResolvedValue({
            uid: merchantId,
            JazzCashDisburseAccountId: "mock-disburse-id",
            balanceToDisburse: new Decimal(2000),
        });
        prisma.disbursement.findFirst.mockResolvedValue(null);
        jazzcashDisburse.getDisburseAccount.mockResolvedValue({
            data: { key: "mock-key", initialVector: "mock-iv" },
        });

        updateTransaction.mockResolvedValue({
            message: "Disbursement created successfully",
            merchantAmount: "1000",
            order_id: "mock-system-order-id",
            externalApiResponse: {
                TransactionReference: "mock-system-order-id",
                TransactionStatus: "success",
            },
        });

        const result = await updateTransaction(token, body, merchantId);

        expect(result).toEqual({
            message: "Disbursement created successfully",
            merchantAmount: "1000",
            order_id: "mock-system-order-id",
            externalApiResponse: {
                TransactionReference: "mock-system-order-id",
                TransactionStatus: "success",
            },
        });
    });

    it("should throw an error if transaction is pending", async () => {
        merchantService.findOne.mockResolvedValue({
            uid: merchantId,
            JazzCashDisburseAccountId: "mock-disburse-id",
            balanceToDisburse: new Decimal(2000),
        });
        prisma.disbursement.findFirst.mockResolvedValue(null);
        jazzcashDisburse.getDisburseAccount.mockResolvedValue({
            data: { key: "mock-key", initialVector: "mock-iv" },
        });

        updateTransaction.mockRejectedValue(new CustomError("Transaction is Pending", 202));

        await expect(updateTransaction(token, body, merchantId)).rejects.toThrow("Transaction is Pending");
    });
});
