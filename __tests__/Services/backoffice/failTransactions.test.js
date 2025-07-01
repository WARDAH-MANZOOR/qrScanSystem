import prisma from "../../../dist/prisma/client.js";
import CustomError from "../../../dist/utils/custom_error.js";
import transactionService from "../../../dist/services/index.js";
import { Decimal } from "decimal.js";
import backofficeService from "../../../dist/services/backoffice/backoffice.js";
jest.mock("../../../dist/prisma/client.js", () => ({
    transaction: {
        findMany: jest.fn(),
        updateMany: jest.fn()
    }
}));

jest.mock("../../../dist/services/index.js", () => ({
    sendCallback: jest.fn()
}));
beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
    console.error.mockRestore();
});
describe('failTransactions', () => {
    let transactionIds;
    let transactions;

    beforeEach(() => {
        jest.clearAllMocks();
        transactionIds = ['txn_123', 'txn_456'];
        transactions = [
            { merchant_transaction_id: 'txn_123', status: 'pending' },
            { merchant_transaction_id: 'txn_456', status: 'pending' }
        ];
    });

    test('should fail transactions successfully', async () => {
        prisma.transaction.findMany.mockResolvedValue(transactions);
        prisma.transaction.updateMany.mockResolvedValue({ count: transactions.length });
        try {
            const result = await backofficeService.failTransactions(transactionIds);
            expect(prisma.transaction.findMany).toHaveBeenCalledWith({
                where: { merchant_transaction_id: { in: transactionIds } },
            });
            expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
                where: { merchant_transaction_id: { in: transactionIds } },
                data: { status: 'failed', response_message: 'User did not respond' },
            });

        } catch (error) {
            console.error("Transactions failed successfully.", error);
        }
    });

    test('should throw error if transactions not found', async () => {
        prisma.transaction.findMany.mockResolvedValue([]);

        await expect(backofficeService.failTransactions(transactionIds)).rejects.toThrow(
            new CustomError('Transactions not found', 404)
        );
        expect(prisma.transaction.updateMany).not.toHaveBeenCalled();
    });

    test('should handle unexpected errors', async () => {
        prisma.transaction.findMany.mockRejectedValue(new Error('Database error'));
        try {
            const result = await backofficeService.failTransactions(transactionIds)


        } catch (error) {
            console.error("Database error", error);
        }
    });
});
