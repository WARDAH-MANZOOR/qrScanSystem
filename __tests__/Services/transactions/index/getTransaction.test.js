import transactionsService from "../../../../dist/services/transactions/index.js"; // Replace with actual path
import prisma from "../../../../dist/prisma/client.js"; // Mock Prisma client
import CustomError from "../../../../dist/utils/custom_error"; // Mock CustomError

jest.mock('../../../../dist/prisma/client.js', () => ({
    merchant: {
        findFirst: jest.fn(),
    },
    transaction: {
        findFirst: jest.fn(),
    },
}));

describe('getTransaction Function', () => {
    const mockMerchantId = 'merchant123';
    const mockTransactionId = 'txn456';

    afterEach(() => {
        jest.clearAllMocks(); // Clears mocks after each test
    });

    it('should throw an error if merchant is not found', async () => {
        // Mock Prisma response: No merchant found
        prisma.merchant.findFirst.mockResolvedValue(null);

        await expect(transactionsService.getTransaction(mockMerchantId, mockTransactionId))
            .rejects.toThrow(new CustomError("Merchant Not Found", 400));

        expect(prisma.merchant.findFirst).toHaveBeenCalledWith({
            where: { uid: mockMerchantId },
            select: { merchant_id: true },
        });
    });

    it('should return error response if transaction is not found', async () => {
        // Mock merchant found
        prisma.merchant.findFirst.mockResolvedValue({ merchant_id: 123 });

        // Mock no transaction found
        prisma.transaction.findFirst.mockResolvedValue(null);

        const result = await transactionsService.getTransaction(mockMerchantId, mockTransactionId);

        expect(result).toEqual({
            message: "Transaction not found",
            statusCode: 500
        });

        expect(prisma.transaction.findFirst).toHaveBeenCalledWith({
            where: {
                merchant_transaction_id: mockTransactionId,
                merchant_id: 123,
                providerDetails: {
                    path: ['name'],
                    equals: "Easypaisa"
                }
            }
        });
    });

    it('should return correct transaction details if transaction exists', async () => {
        // Mock merchant found
        prisma.merchant.findFirst.mockResolvedValue({ merchant_id: 123 });

        // Mock transaction found
        const mockTransaction = {
            merchant_transaction_id: mockTransactionId,
            status: "SUCCESS",
            original_amount: 1000,
            date_time: "2024-02-20T12:34:56Z",
            providerDetails: { msisdn: "923001234567" },
            response_message: "Transaction successful"
        };
        prisma.transaction.findFirst.mockResolvedValue(mockTransaction);

        const result = await transactionsService.getTransaction(mockMerchantId, mockTransactionId);

        expect(result).toEqual({
            "orderId": mockTransactionId,
            "transactionStatus": "SUCCESS",
            "transactionAmount": 1000,
            "transactionDateTime": "2024-02-20T12:34:56Z",
            "msisdn": "923001234567",
            "responseDesc": "Transaction successful",
            "responseMode": "MA",
            "statusCode": 201
        });

        expect(prisma.transaction.findFirst).toHaveBeenCalledWith({
            where: {
                merchant_transaction_id: mockTransactionId,
                merchant_id: 123,
                providerDetails: {
                    path: ['name'],
                    equals: "Easypaisa"
                }
            }
        });
    });

    it('should throw a CustomError if an unexpected error occurs', async () => {
        // Mock Prisma throwing an error
        prisma.merchant.findFirst.mockRejectedValue(new Error("Database Error"));

        await expect(transactionsService.getTransaction(mockMerchantId, mockTransactionId))
            .rejects.toThrow(new CustomError("Database Error", 500));
    });
});