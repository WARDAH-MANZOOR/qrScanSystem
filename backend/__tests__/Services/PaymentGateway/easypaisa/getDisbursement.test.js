import easyPaisaService from '../../../../dist/services/paymentGateway/easypaisa.js';
import prisma from '../../../../dist/prisma/client.js';
import CustomError from '../../../../dist/utils/custom_error.js';
import { parseISO } from 'date-fns';

// Mock prisma client methods
jest.mock("../../../../dist/prisma/client.js", () => ({
  disbursement: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
}));

jest.mock('date-fns', () => ({
  parseISO: jest.fn(),
}));



describe('getDisbursement', () => {
    let params;
    beforeEach(() => {
        params = {
            start: '2025-01-01 00:00:00',
            end: '2025-01-31 23:59:59',
            account: 'testAccount',
            transaction_id: 'txn123',
            merchantTransactionId: 'merchantTxn123',
            page: 1,
            limit: 10,
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return disbursements for valid merchant and parameters', async () => {
        const mockDisbursements = [{
            merchant_transaction_id: 'txn123',
            disbursementDate: new Date(),
            account: 'testAccount',
            transaction_id: 'txn123',
            merchant_custom_order_id: 'merchantTxn123',
            merchant: {
                uid: 'merchant123',
                full_name: 'Merchant A'
            }
        }];
        prisma.disbursement.findMany.mockResolvedValueOnce(mockDisbursements);

        const response = await easyPaisaService.getDisbursement('merchant123', params);

        expect(response.transactions.length).toBe(1);
        expect(response.transactions[0].merchant_transaction_id).toBe('txn123');
        expect(prisma.disbursement.findMany).toHaveBeenCalled();
    });

    it('should return disbursements with pagination when page and limit are provided', async () => {
        const mockDisbursements = [{
            merchant_transaction_id: 'txn123',
            disbursementDate: new Date(),
            account: 'testAccount',
            transaction_id: 'txn123',
            merchant_custom_order_id: 'merchantTxn123',
            merchant: {
                uid: 'merchant123',
                full_name: 'Merchant A'
            }
        }];
        prisma.disbursement.findMany.mockResolvedValueOnce(mockDisbursements);
        prisma.disbursement.count.mockResolvedValueOnce(20); // Total of 20 disbursements in the DB

        const response = await easyPaisaService.getDisbursement('merchant123', { ...params, page: 1, limit: 10 });

        expect(response.meta.pages).toBe(2);  // 20 items with a limit of 10 per page
        expect(response.transactions.length).toBe(1);
    });

    

    it('should filter disbursements based on account, transaction_id, and date range', async () => {
        const mockDisbursements = [{
            merchant_transaction_id: 'txn123',
            disbursementDate: new Date(),
            account: 'testAccount',
            transaction_id: 'txn123',
            merchant_custom_order_id: 'merchantTxn123',
            merchant: {
                uid: 'merchant123',
                full_name: 'Merchant A'
            }
        }];
        prisma.disbursement.findMany.mockResolvedValueOnce(mockDisbursements);

        const response = await easyPaisaService.getDisbursement('merchant123', { ...params, account: 'testAccount', transaction_id: 'txn123' });

        expect(response.transactions.length).toBe(1);
        expect(response.transactions[0].transaction_id).toBe('txn123');
    });

    it('should return an empty list if no disbursements match the filter', async () => {
        prisma.disbursement.findMany.mockResolvedValueOnce([]);

        const response = await easyPaisaService.getDisbursement('merchant123', { ...params, account: 'nonexistentAccount' });

        expect(response.transactions.length).toBe(0);
    });
});
