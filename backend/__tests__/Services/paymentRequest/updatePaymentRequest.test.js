import prisma from "../../../dist/prisma/client.js";
import servicePaymentRequest from "../../../dist/services/paymentRequest/index.js";
import CustomError from "../../../dist/utils/custom_error.js";

// Mock Prisma Client

jest.mock('../../../dist/prisma/client.js', () => ({
    paymentRequest: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
    },
    transaction: {
        findFirst: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback({
        paymentRequest: {
            update: jest.fn(),
        },
    })),
}));
describe("updatePaymentRequest", () => {
    it("should throw a CustomError if transaction is not found", async () => {
        const paymentRequestId = "payment-id";
        const data = { transactionId: "transaction-id" };
        const user = { id: "user-id" };

        prisma.transaction.findFirst.mockResolvedValue(null);

        expect.assertions(2);

        try {
            await servicePaymentRequest.updatePaymentRequest(paymentRequestId, data, user);
        } catch (error) {
            expect(error).toBeInstanceOf(CustomError);
            expect(error).toMatchObject({
                message: "Transaction not found",
                statusCode: 404,
            });
        }
    });

    it("should throw a CustomError if payment request is not found for the user", async () => {
        const paymentRequestId = "payment-id";
        const data = { transactionId: "transaction-id" };
        const user = { id: "user-id" };

        prisma.transaction.findFirst.mockResolvedValue({ transaction_id: "transaction-id" });
        prisma.paymentRequest.findFirst.mockResolvedValue({ userId: "other-user-id" });

        expect.assertions(2);

        try {
            await servicePaymentRequest.updatePaymentRequest(paymentRequestId, data, user);
        } catch (error) {
            expect(error).toBeInstanceOf(CustomError);
            expect(error).toMatchObject({
                message: "Payment request not found",
                statusCode: 404,
            });
        }
    });

    it("should update the payment request successfully", async () => {
        const paymentRequestId = "payment-id";
        const data = {
            transactionId: "transaction-id",
            amount: 100,
            status: "completed",
            email: "test@example.com",
            description: "Updated description",
            provider: "PayPal",
            dueDate: "2025-01-01",
            link: "http://example.com",
            metadata: { key: "value" },
        };
        const user = { id: "user-id" };
    
        prisma.transaction.findFirst.mockResolvedValue({ transaction_id: "transaction-id" });
        prisma.paymentRequest.findFirst.mockResolvedValue({ userId: "user-id" });
        prisma.$transaction.mockImplementation(async (callback) => {
            const tx = {
                paymentRequest: {
                    update: jest.fn().mockResolvedValue({
                        id: paymentRequestId,
                        ...data,
                    }),
                },
            };
            return callback(tx);
        });
    
        const result = await servicePaymentRequest.updatePaymentRequest(paymentRequestId, data, user);
    
        expect(result).toEqual({
            message: "Payment request updated successfully",
            data: { id: paymentRequestId, ...data },
        });
    });
    
    
    it("should throw a CustomError with default message on unexpected error", async () => {
        const paymentRequestId = "payment-id";
        const data = { transactionId: "transaction-id" };
        const user = { id: "user-id" };

        prisma.transaction.findFirst.mockRejectedValue(new Error("An error occurred while updating the payment request"));

        expect.assertions(2);

        try {
            await servicePaymentRequest.updatePaymentRequest(paymentRequestId, data, user);
        } catch (error) {
            expect(error).toBeInstanceOf(CustomError);
            expect(error).toMatchObject({
                message: "An error occurred while updating the payment request",
                statusCode: 500,
            });
        }
    });
});
