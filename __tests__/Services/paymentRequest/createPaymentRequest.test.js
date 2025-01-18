import servicePaymentRequest from "../../../dist/services/paymentRequest/index.js";
import prisma from "../../../dist/prisma/client.js";
import CustomError from "../../../dist/utils/custom_error.js";

jest.mock("../../../dist/prisma/client.js", () => ({
    $transaction: jest.fn((callback) => callback({
        paymentRequest: {
            create: jest.fn(),
            update: jest.fn(),
        },
    })),
}));

describe("createPaymentRequest function", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    const mockUser = {
        id: "user123",
        role: "Merchant",
    };

    const mockData = {
        amount: 1000,
        email: "test@example.com",
        description: "Test payment request",
        transactionId: "trans123",
        dueDate: "2025-01-31",
        provider: "JazzCash",
        link: "",
        metadata: { orderId: "order123" },
    };

    it("should create a payment request successfully", async () => {
        const mockNewPaymentRequest = { id: "paymentRequest123", ...mockData };
        const mockUpdatedPaymentRequest = {
            id: "paymentRequest123",
            ...mockData,
            link: "/pay/paymentRequest123",
        };

        prisma.$transaction.mockImplementationOnce((callback) =>
            callback({
                paymentRequest: {
                    create: jest.fn().mockResolvedValue(mockNewPaymentRequest),
                },
            })
        );

        prisma.$transaction.mockImplementationOnce((callback) =>
            callback({
                paymentRequest: {
                    update: jest.fn().mockResolvedValue(mockUpdatedPaymentRequest),
                },
            })
        );

        const result = await servicePaymentRequest.createPaymentRequest(mockData, mockUser);

        expect(result).toEqual({
            message: "Payment request created successfully",
            data: mockUpdatedPaymentRequest,
        });
        expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    });

    it("should throw an error if the user is not a merchant", async () => {
        const nonMerchantUser = { ...mockUser, role: "Customer" };

        await expect(servicePaymentRequest.createPaymentRequest(mockData, nonMerchantUser)).rejects.toThrow(
            new CustomError("Only merchants can create payment requests", 403)
        );
    });

    it("should throw an error if the user ID is missing", async () => {
        const invalidUser = { ...mockUser, id: null };

        await expect(servicePaymentRequest.createPaymentRequest(mockData, invalidUser)).rejects.toThrow(
            new CustomError("User not found", 400)
        );
    });

    it("should throw an error if prisma transaction fails during creation", async () => {
        prisma.$transaction.mockImplementationOnce(() => {
            throw new Error("Database error during creation");
        });

        await expect(servicePaymentRequest.createPaymentRequest(mockData, mockUser)).rejects.toThrow(
            new CustomError("Database error during creation", 500)
        );
    });

    it("should throw an error if prisma transaction fails during update", async () => {
        const mockNewPaymentRequest = { id: "paymentRequest123", ...mockData };

        prisma.$transaction.mockImplementationOnce((callback) =>
            callback({
                paymentRequest: {
                    create: jest.fn().mockResolvedValue(mockNewPaymentRequest),
                },
            })
        );

        prisma.$transaction.mockImplementationOnce(() => {
            throw new Error("Database error during update");
        });

        await expect(servicePaymentRequest.createPaymentRequest(mockData, mockUser)).rejects.toThrow(
            new CustomError("Database error during update", 500)
        );
    });
});
