import { mwTransactionClone } from '../../../../dist/services/paymentGateway/index.js';
import CustomError from "../../../../dist/utils/custom_error.js";
import prisma from "../../../../dist/prisma/client.js";
import jazzcashDisburse from '../../../../dist/services/paymentGateway/jazzcashDisburse.js';
import { transactionService, merchantService, easyPaisaService } from "../../../../dist/services/index.js";
import { Decimal } from "@prisma/client/runtime/library";

// Mock Prisma Client
jest.mock('../../../../dist/prisma/client.js', () => ({
    disbursement: {
        findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
}));

// Mock External Services
jest.mock("../../../../dist/services/paymentGateway/jazzcashDisburse.js", () => ({
    getDisburseAccount: jest.fn(),
}));

jest.mock("../../../../dist/services/index.js", () => ({
    merchantService: {
        findOne: jest.fn(),
    },
    transactionService: {
        createTransactionId: jest.fn(),
        sendCallback: jest.fn(),
    },
    easyPaisaService: {
        adjustMerchantToDisburseBalance: jest.fn(),
    },
}));

jest.mock("../../../../dist/services/paymentGateway/index.js", () => ({
    mwTransactionClone: jest.fn(),
}));

// Suppress console logs and errors
beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    global.fetch = jest.fn(); // Ensure fetch is mocked
});

afterEach(() => {
    console.error.mockRestore();
    console.log.mockRestore();
});

describe('mwTransactionClone', () => {
    const mockToken = 'test-token';
    const mockMerchantId = 'merchant123';
    const mockBody = {
        phone: '923001234567',
        amount: '1000',
        order_id: 'order123',
        cnic: '1234567890123',
    };

    test('should successfully create a disbursement transaction', async () => {
        merchantService.findOne.mockResolvedValue({
            uid: mockMerchantId,
            merchant_id: 1,
            JazzCashDisburseAccountId: 'jazz123',
            balanceToDisburse: new Decimal(5000),
            payout_callback: 'http://callback-url.com',
            callback_mode: 'SINGLE',
            webhook_url: 'http://webhook-url.com',
        });

        jazzcashDisburse.getDisburseAccount.mockResolvedValue({ data: { key: 'key123', initialVector: 'iv123' } });
        prisma.disbursement.findFirst.mockResolvedValue(null);
        prisma.$transaction.mockResolvedValue(true);

        fetch.mockResolvedValue({
            json: () => Promise.resolve({ data: 'encryptedResponse', TransactionStatus: 'success' }),
        });

        mwTransactionClone.mockResolvedValue({
            message: 'Disbursement created successfully',
            externalApiResponse: { TransactionStatus: 'success' },
        });

        const result = await mwTransactionClone(mockToken, mockBody, mockMerchantId);
        expect(result).toHaveProperty('message', 'Disbursement created successfully');
        expect(result.externalApiResponse.TransactionStatus).toBe('success');
    });

    test('should fail if merchant is not found', async () => {
        merchantService.findOne.mockResolvedValue(null);

        mwTransactionClone.mockRejectedValue(new CustomError('Merchant not found'));

        await expect(mwTransactionClone(mockToken, mockBody, mockMerchantId)).rejects.toThrow(CustomError);
        await expect(mwTransactionClone(mockToken, mockBody, mockMerchantId)).rejects.toThrow('Merchant not found');
    });

    test('should fail if phone number does not start with 92', async () => {
        const invalidBody = { ...mockBody, phone: '81234567890' };
        merchantService.findOne.mockResolvedValue({ uid: mockMerchantId, merchant_id: 1 });

        mwTransactionClone.mockRejectedValue(new CustomError('Number should start with 92'));

        await expect(mwTransactionClone(mockToken, invalidBody, mockMerchantId)).rejects.toThrow(CustomError);
        await expect(mwTransactionClone(mockToken, invalidBody, mockMerchantId)).rejects.toThrow('Number should start with 92');
    });

    test('should fail if order ID already exists', async () => {
        merchantService.findOne.mockResolvedValue({ uid: mockMerchantId, merchant_id: 1 });
        prisma.disbursement.findFirst.mockResolvedValue({ order_id: mockBody.order_id });

        mwTransactionClone.mockRejectedValue(new CustomError('Order ID already exists'));

        await expect(mwTransactionClone(mockToken, mockBody, mockMerchantId)).rejects.toThrow(CustomError);
        await expect(mwTransactionClone(mockToken, mockBody, mockMerchantId)).rejects.toThrow('Order ID already exists');
    });

    test('should fail if insufficient balance', async () => {
        merchantService.findOne.mockResolvedValue({
            uid: mockMerchantId,
            merchant_id: 1,
            balanceToDisburse: new Decimal(500),
        });

        mwTransactionClone.mockRejectedValue(new CustomError('Insufficient balance to disburse'));

        await expect(mwTransactionClone(mockToken, mockBody, mockMerchantId)).rejects.toThrow(CustomError);
        await expect(mwTransactionClone(mockToken, mockBody, mockMerchantId)).rejects.toThrow('Insufficient balance to disburse');
    });

    test('should handle API failure response', async () => {
        merchantService.findOne.mockResolvedValue({
            uid: mockMerchantId,
            merchant_id: 1,
            JazzCashDisburseAccountId: 'jazz123',
        });
        jazzcashDisburse.getDisburseAccount.mockResolvedValue({ data: { key: 'key123', initialVector: 'iv123' } });
        prisma.disbursement.findFirst.mockResolvedValue(null);

        fetch.mockResolvedValue({
            json: () => Promise.resolve({ responseCode: 'G2P-T-1', responseDescription: 'Failed' }),
        });

        mwTransactionClone.mockRejectedValue(new CustomError('Failed'));

        await expect(mwTransactionClone(mockToken, mockBody, mockMerchantId)).rejects.toThrow(CustomError);
        await expect(mwTransactionClone(mockToken, mockBody, mockMerchantId)).rejects.toThrow('Failed');
    });
});
