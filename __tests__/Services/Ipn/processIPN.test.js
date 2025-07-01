import prisma from "../../../dist/prisma/client.js";
import IPNService from "../../../dist/services//ipn/index.js";  // Adjust path as needed
import CustomError from "../../../dist/utils/custom_error.js";

// Mock prisma.transaction.update method
jest.mock("../../../dist/prisma/client.js", () => ({
    transaction: {
        update: jest.fn(),
    },
}));

describe('processIPN', () => {
    beforeEach(() => {
        jest.clearAllMocks(); // Clear mocks before each test
    });

    it('should update transaction to completed when response code is 121', async () => {
        const requestBody = {
            pp_ResponseCode: '121',
            pp_TxnRefNo: 'txn123',
            pp_ResponseMessage: 'Transaction completed successfully',
        };

        await IPNService.processIPN(requestBody);

        expect(prisma.transaction.update).toHaveBeenCalledWith({
            where: { merchant_transaction_id: 'txn123' },
            data: {
                status: 'completed',
                response_message: 'Transaction completed successfully',
            },
        });
    });

    it('should update transaction to failed when response code is 199', async () => {
        const requestBody = {
            pp_ResponseCode: '199',
            pp_TxnRefNo: 'txn123',
            pp_ResponseMessage: 'Transaction failed',
        };

        await IPNService.processIPN(requestBody);

        expect(prisma.transaction.update).toHaveBeenCalledWith({
            where: { merchant_transaction_id: 'txn123' },
            data: {
                status: 'failed',
                response_message: 'Transaction failed',
            },
        });
    });

    it('should update transaction to failed when response code is 999', async () => {
        const requestBody = {
            pp_ResponseCode: '999',
            pp_TxnRefNo: 'txn123',
            pp_ResponseMessage: 'Transaction failed due to unknown error',
        };

        await IPNService.processIPN(requestBody);

        expect(prisma.transaction.update).toHaveBeenCalledWith({
            where: { merchant_transaction_id: 'txn123' },
            data: {
                status: 'failed',
                response_message: 'Transaction failed due to unknown error',
            },
        });
    });

    it('should return success response for MWALLET transaction type', async () => {
        const requestBody = {
            pp_ResponseCode: '121',
            pp_TxnRefNo: 'txn123',
            pp_ResponseMessage: 'Transaction completed successfully',
            pp_TxnType: 'MWALLET',
        };

        const result = await IPNService.processIPN(requestBody);

        expect(result).toEqual({
            pp_ResponseCode: '000',
            pp_ResponseMessage: 'IPN received successfully',
            pp_SecureHash: '', // Expected SecureHash can be adjusted
        });
    });

    it('should throw an error if prisma.update fails', async () => {
        prisma.transaction.update.mockRejectedValue(new Error('Database error'));

        const requestBody = {
            pp_ResponseCode: '121',
            pp_TxnRefNo: 'txn123',
            pp_ResponseMessage: 'Transaction completed successfully',
        };

        await expect(IPNService.processIPN(requestBody))
            .rejects
            .toThrowError(new CustomError('Database error', 500));
    });
});
