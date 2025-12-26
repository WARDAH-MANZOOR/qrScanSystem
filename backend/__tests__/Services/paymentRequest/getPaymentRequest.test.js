import prisma from "../../../dist/prisma/client.js";
import servicePaymentRequest from "../../../dist/services/paymentRequest/index.js";
import CustomError from "../../../dist/utils/custom_error.js";

// Mock Prisma Client
jest.mock('../../../dist/prisma/client.js', () => ({
    paymentRequest: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
    },
}));

describe("getPaymentRequest", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should retrieve a specific payment request successfully", async () => {
        const mockPaymentRequest = {
            id: "paymentRequestId",
            amount: 1000,
            userId: "merchantId",
            deletedAt: null,
        };

        prisma.paymentRequest.findFirst.mockResolvedValue(mockPaymentRequest);

        const input = {
            user: { merchant_id: "merchantId" },
            id: "paymentRequestId",
        };

        const result = await servicePaymentRequest.getPaymentRequest(input);

        expect(result).toEqual({
            message: "Payment request retrieved successfully",
            data: mockPaymentRequest,
        });
        expect(prisma.paymentRequest.findFirst).toHaveBeenCalledWith({
            where: {
                deletedAt: null,
                userId: "merchantId",
                id: "paymentRequestId",
            },
        });
    });

    it("should retrieve all payment requests for a user", async () => {
        const mockPaymentRequests = [
            { id: "request1", amount: 1000, userId: "merchantId", deletedAt: null },
            { id: "request2", amount: 2000, userId: "merchantId", deletedAt: null },
        ];

        prisma.paymentRequest.findMany.mockResolvedValue(mockPaymentRequests);

        const input = {
            user: { merchant_id: "merchantId" },
        };

        const result = await servicePaymentRequest.getPaymentRequest(input);

        expect(result).toEqual({
            message: "Payment requests retrieved successfully",
            data: mockPaymentRequests,
        });
        expect(prisma.paymentRequest.findMany).toHaveBeenCalledWith({
            where: {
                deletedAt: null,
                userId: "merchantId",
            },
        });
    });

    it("should throw an error if user.merchant_id is not provided", async () => {
        const input = { user: {} };

        await expect(servicePaymentRequest.getPaymentRequest(input)).rejects.toThrow(
            new CustomError("User not found", 400)
        );
    });

    it("should throw an error if a specific payment request is not found", async () => {
        prisma.paymentRequest.findFirst.mockResolvedValue(null);

        const input = {
            user: { merchant_id: "merchantId" },
            id: "nonexistentRequestId",
        };

        await expect(servicePaymentRequest.getPaymentRequest(input)).rejects.toThrow(
            new CustomError("Payment request not found", 404)
        );
    });

  

    it("should throw a generic error if an unexpected error occurs", async () => {
        prisma.paymentRequest.findMany.mockRejectedValue(new Error("Database connection error"));

        const input = {
            user: { merchant_id: "valid-merchant-id" },
        };

        await expect(servicePaymentRequest.getPaymentRequest(input)).rejects.toThrow(
            "Database connection error"
        );
    });
});
