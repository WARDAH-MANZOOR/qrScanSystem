import jazzCashService from '../../../../dist/services/paymentGateway/jazzCash.js';
import prisma from '../../../../dist/prisma/client.js';
import { transactionService } from '../../../../dist/services/index.js';

jest.mock('../../../../dist/prisma/client.js', () => ({
    merchant: { findFirst: jest.fn() },
    jazzCashMerchant: { findFirst: jest.fn() },
    transaction: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },
    $transaction: jest.fn(),
}));
jest.mock('../../../../dist/services/index.js');

const mockDate = new Date('2025-01-14T12:00:00Z');
const timeZone = 'Asia/Karachi';

describe('initiateJazzCashPayment', () => {
    const paymentData = {
        amount: '100',
        phone: '03022082257',
        redirect_url: 'https://example.com',
        type: 'WALLET',
    };

    const merchant_uid = 'merchant123';
    const mockJazzCashMerchantData = {
        merchant_id: 'merchant_id123',
        someOtherField: 'value',
    };

    beforeAll(() => {
        jest.useFakeTimers().setSystemTime(new Date('2025-01-14T12:00:00Z'));
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterAll(() => {
        jest.useRealTimers();
        console.log.mockRestore();
        console.error.mockRestore();
    });

    
    
    it('should throw an error for invalid payment data', async () => {
        transactionService.validatePaymentData = jest.fn(() => {
            throw new Error('Amount and phone are required');
        });

        const result = await jazzCashService.initiateJazzCashPaymentAsync({}, merchant_uid);

        expect(result.statusCode).toBe(400);
        expect(result.message).toBe('Amount and phone are required');
        expect(result.txnNo).toBe('');
    });
    it('should handle errors during Prisma transaction', async () => {
        prisma.$transaction.mockRejectedValue(new Error('Database error'));

        const result = await jazzCashService.initiateJazzCashPaymentAsync(paymentData, merchant_uid);

        expect(result.statusCode).toBe(500);
        expect(result.message).toBe('Database error');
        expect(result.txnNo).toBe('');
    });
    it('should handle errors during async processing', async () => {
        prisma.$transaction.mockResolvedValueOnce({
            refNo: "txn123",
            integritySalt: "testSalt",
            merchant: {
                jazzCashMerchant: {
                    jazzMerchantId: "testMerchantId",
                    password: "testPassword",
                    returnUrl: "testReturnUrl",
                },
            },
        });
    
        transactionService.prepareJazzCashPayload = jest.fn(() => {
            throw new Error("Async processing failed");
        });
    
        const result = await jazzCashService.initiateJazzCashPaymentAsync(paymentData, merchant_uid);
    
        console.error(result); // Debugging output
    
        expect(result.statusCode).toBe("pending");
        expect(result.message).toBe("Transaction is being processed");
    });
    
});


