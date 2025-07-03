import servicePaymentRequest from "../../../dist/services/paymentRequest/index.js";
import prisma from "../../../dist/prisma/client.js";
import CustomError from "../../../dist/utils/custom_error.js";
jest.mock("../../../dist/prisma/client.js", () => ({
    merchant: {
        findFirst: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback({
        paymentRequest: {
            create: jest.fn(),
            update: jest.fn(),
        },
    })),
}));

describe("createPaymentRequestClone", () => {
    const mockData = {
        amount: 100,
        description: "Test payment",
        transactionId: "tx1234",
        dueDate: "2025-01-01",
        provider: "TestProvider",
        link: "https://testlink.com",
        metadata: {},
        order_id: "order123",
        storeName: "Test Store",
    };
    const mockUser = "user123";

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should throw an error if user ID is not provided", async () => {
        await expect(servicePaymentRequest.createPaymentRequestClone(mockData, null)).rejects.toThrow("User Id not given");
    });

    it("should create a payment request successfully", async () => {
        prisma.merchant.findFirst.mockResolvedValue({ merchant_id: "merchant123" });
        const mockNewPaymentRequest = { id: "payment123" };
        prisma.$transaction.mockImplementation(async (callback) => {
            const tx = {
                paymentRequest: {
                    create: jest.fn().mockResolvedValue(mockNewPaymentRequest),
                    update: jest.fn().mockResolvedValue({ ...mockNewPaymentRequest, link: "/pay/payment123" }),
                },
            };
            return callback(tx);
        });

        const result = await servicePaymentRequest.createPaymentRequestClone(mockData, mockUser);

        expect(result).toEqual({
            message: "Payment request created successfully",
            data: {
                id: "payment123",
                link: "/pay/payment123",
                completeLink: "https://sahulatpay.com/pay/payment123",
                storeName: mockData.storeName,
                order_id: mockData.order_id,
            },
        });
    });

    it("should handle transaction errors correctly", async () => {
        prisma.merchant.findFirst.mockResolvedValue({ merchant_id: "merchant123" });
        prisma.$transaction.mockImplementation(async () => {
            throw new Error("Transaction failed");
        });

        await expect(servicePaymentRequest.createPaymentRequestClone(mockData, mockUser)).rejects.toThrow("Transaction failed");
    });
});
