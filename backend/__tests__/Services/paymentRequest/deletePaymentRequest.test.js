import prisma from "../../../dist/prisma/client.js";
import servicePaymentRequest from "../../../dist/services/paymentRequest/index.js";
import CustomError from "../../../dist/utils/custom_error.js";

// Mock Prisma Client
jest.mock("../../../dist/prisma/client.js", () => ({
    paymentRequest: {
        findFirst: jest.fn(),
        update: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback({
        paymentRequest: {
            update: jest.fn(),
        },
    })),
}));

describe("deletePaymentRequest", () => {
    it("should throw a CustomError if payment request is not found", async () => {
        const paymentRequestId = "payment-id";

        // Mock behavior: payment request not found
        prisma.paymentRequest.findFirst.mockResolvedValue(null);

        expect.assertions(2);

        try {
            await servicePaymentRequest.deletePaymentRequest(paymentRequestId);
        } catch (error) {
            expect(error).toBeInstanceOf(CustomError);
            expect(error).toMatchObject({
                message: "Payment request not found",
                statusCode: 404,
            });
        }
    });

    it("should delete the payment request successfully", async () => {
        const paymentRequestId = "payment-id";
        const mockDeletedPaymentRequest = {
            id: paymentRequestId,
            deletedAt: new Date(),
        };

        // Mock successful retrieval of payment request
        prisma.paymentRequest.findFirst.mockResolvedValue({
            id: paymentRequestId,
            deletedAt: null,
        });

        // Mock successful deletion
        prisma.$transaction.mockImplementation(async (callback) => {
            const tx = {
                paymentRequest: {
                    update: jest.fn().mockResolvedValue(mockDeletedPaymentRequest),
                },
            };
            return callback(tx);
        });

        const result = await servicePaymentRequest.deletePaymentRequest(paymentRequestId);

        expect(result).toEqual({
            message: "Payment request deleted successfully",
            data: mockDeletedPaymentRequest,
        });
    });

    it("should throw a CustomError with default message on unexpected error", async () => {
        const paymentRequestId = "payment-id";

        // Mock an unexpected error
        prisma.paymentRequest.findFirst.mockRejectedValue(new Error("Unexpected error"));

        expect.assertions(2);

        try {
            await servicePaymentRequest.deletePaymentRequest(paymentRequestId);
        } catch (error) {
            expect(error).toBeInstanceOf(CustomError);
            expect(error).toMatchObject({
                message: "Unexpected error",
                statusCode: 500,
            });
        }
    });

    it("should throw a CustomError if $transaction fails during deletion", async () => {
        const paymentRequestId = "payment-id";

        // Mock successful retrieval of payment request
        prisma.paymentRequest.findFirst.mockResolvedValue({
            id: paymentRequestId,
            deletedAt: null,
        });

        // Mock transaction failure
        prisma.$transaction.mockRejectedValue(new Error("Transaction failed"));

        expect.assertions(2);

        try {
            await servicePaymentRequest.deletePaymentRequest(paymentRequestId);
        } catch (error) {
            expect(error).toBeInstanceOf(CustomError);
            expect(error).toMatchObject({
                message: "Transaction failed",
                statusCode: 500,
            });
        }
    });
});
