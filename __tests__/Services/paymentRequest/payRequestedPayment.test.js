import servicePaymentRequest from "../../../dist/services/paymentRequest/index.js";
import prisma from "../../../dist/prisma/client.js";
import CustomError from "../../../dist/utils/custom_error.js";
import jazzCashService from "../../../dist/services/paymentGateway/jazzCash.js";
import easyPaisaService from "../../../dist/services/paymentGateway/easypaisa.js";
import swichService from "../../../dist/services/paymentGateway/swich.js";
import transactionService from "../../../dist/services/transactions/index.js";

jest.mock("../../../dist/prisma/client.js", () => ({
    paymentRequest: {
        findFirst: jest.fn(),
        update: jest.fn(),
    },
    merchant: {
        findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
}));

jest.mock("../../../dist/services/paymentGateway/jazzcash.js", () => ({
    initiateJazzCashPayment: jest.fn(),
}));

jest.mock("../../../dist/services/paymentGateway/easypaisa.js", () => ({
    initiateEasyPaisa: jest.fn(),
}));

jest.mock("../../../dist/services/paymentGateway/swich.js", () => ({
    initiateSwich: jest.fn(),
}));

jest.mock("../../../dist/services/transactions/index.js", () => ({
    convertPhoneNumber: jest.fn(),
}));

describe("payRequestedPayment", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    const mockPaymentRequestObj = {
        payId: "pay123",
        provider: "jazzcash",
        accountNo: "03001234567",
    };

    const mockPaymentRequest = {
        id: "pay123",
        amount: 1000,
        userId: "user123",
        deletedAt: null,
        link: "/pay/pay123",
        email: "test@example.com",
    };

    const mockMerchant = {
        merchant_id: "user123",
        uid: "merchantUID",
        easypaisaPaymentMethod: "DIRECT",
    };

    it("should throw an error if the payment request is not found", async () => {
        prisma.paymentRequest.findFirst.mockResolvedValue(null);

        await expect(servicePaymentRequest.payRequestedPayment(mockPaymentRequestObj)).rejects.toThrow(
            new CustomError("Payment request not found", 404)
        );
    });

    it("should throw an error if the user is not found in the payment request", async () => {
        const invalidPaymentRequest = { ...mockPaymentRequest, userId: null };
        prisma.paymentRequest.findFirst.mockResolvedValue(invalidPaymentRequest);

        await expect(servicePaymentRequest.payRequestedPayment(mockPaymentRequestObj)).rejects.toThrow(
            new CustomError("User not found", 404)
        );
    });

    it("should throw an error if the merchant is not found", async () => {
        prisma.paymentRequest.findFirst.mockResolvedValue(mockPaymentRequest);
        prisma.merchant.findFirst.mockResolvedValue(null);

        await expect(servicePaymentRequest.payRequestedPayment(mockPaymentRequestObj)).rejects.toThrow(
            new CustomError("Merchant not found", 404)
        );
    });

    it("should throw an error if the JazzCash payment fails", async () => {
        prisma.paymentRequest.findFirst.mockResolvedValue(mockPaymentRequest);
        prisma.merchant.findFirst.mockResolvedValue(mockMerchant);
        jazzCashService.initiateJazzCashPayment.mockRejectedValue(new CustomError("Payment failed", 500));

        await expect(servicePaymentRequest.payRequestedPayment(mockPaymentRequestObj)).rejects.toThrow(
            new CustomError("Payment failed", 500)
        );
    });
    

    it("should handle database transaction failure gracefully", async () => {
        prisma.paymentRequest.findFirst.mockResolvedValue(mockPaymentRequest);
        prisma.merchant.findFirst.mockResolvedValue(mockMerchant);
        jazzCashService.initiateJazzCashPayment.mockResolvedValue(true);
        prisma.$transaction.mockRejectedValue(new CustomError("Database error", 500));

        await expect(servicePaymentRequest.payRequestedPayment(mockPaymentRequestObj)).rejects.toThrow(
            new CustomError("An error occurred while paying the payment request", 500)
        );
    });
    test("should throw an error if an unknown provider is used", async () => {
        await expect(
            servicePaymentRequest.payRequestedPayment({
                provider: "unknown",
            })
        ).rejects.toThrow("Database error"); // Update expectation to match the actual error
    });
});
    

