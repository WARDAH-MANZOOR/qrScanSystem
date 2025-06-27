import { mwTransaction } from "../../../../dist/services/paymentGateway/index.js";
import { merchantService, transactionService } from "../../../../dist/services/index.js";
import CustomError from "../../../../dist/utils/custom_error.js";
import prisma from "../../../../dist/prisma/client.js";
import { decryptData } from "../../../../dist/utils/enc_dec.js";
import { backofficeService } from "../../../../dist/services/backoffice/backoffice.js";
import { getEligibleTransactions, getMerchantRate,getWalletBalance } from "../../../../dist/services/paymentGateway/disbursement.js";
import fetch from "node-fetch";
import jazzcashDisburse  from "../../../../dist/services/paymentGateway/jazzcashDisburse.js";   

// Mock dependencies
jest.mock("../../../../dist/prisma/client.js", () => ({
    disbursement: {
        findFirst: jest.fn(),
        create: jest.fn()
    },
    $transaction: jest.fn()
}));
jest.mock("../../../../dist/services/backoffice/backoffice.js", () => ({
    disbursement: {
        findFirst: jest.fn(),
        create: jest.fn()
    },
    $transaction: jest.fn()
}));
jest.mock("../../../../dist/services/paymentGateway/jazzcashDisburse.js", () => ({
    getDisburseAccount: jest.fn(),
  }));
jest.mock("../../../../dist/services/index.js", () => ({
    merchantService: {
      findOne: jest.fn(),
    },
    transactionService: {
        createTransactionId: jest.fn(),
        sendCallback: jest.fn()
    },
  }));
jest.mock("node-fetch");

jest.mock("../../../../dist/utils/enc_dec.js");
jest.mock("../../../../dist/services/paymentGateway/disbursement.js", () => ({
    getEligibleTransactions: jest.fn().mockResolvedValue([
      {
        transaction_id: "txn1",
        balance: 3000,
        settled_amount: 3000,
        original_amount: 3000,
      },
    ]),
    getMerchantRate: jest.fn(),
    getWalletBalance: jest.fn(),
  }));

  beforeEach(() => {
    jest.clearAllMocks(); // Reset mock state before each test
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
    jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.error
});

  afterEach(() => {
    console.error.mockRestore(); // Restore console.error after tests
  });
describe('mwTransaction', () => {
const token = 'mocked-token';
const merchantId = 'merchant-123';
const body = {
    phone: '923001234567',
    cnic: '1234567890123',
    amount: '5000',
    order_id: 'order-123'
};

beforeEach(() => {
    jest.clearAllMocks();
});

    it('should process a successful transaction', async () => {
        merchantService.findOne.mockResolvedValue({
            merchant_id: 'merchant-123',
            JazzCashDisburseAccountId: 'account-123',
            callback_mode: 'DOUBLE',
            payout_callback: 'https://callback.url'
        });
        jazzcashDisburse.getDisburseAccount.mockResolvedValue({ data: { key: 'key', initialVector: 'iv' } });
        prisma.disbursement.findFirst.mockResolvedValue(null);
        prisma.$transaction.mockImplementation((cb) => cb({ disbursement: { create: jest.fn() } }));
        transactionService.createTransactionId.mockReturnValue('transaction-123');

        global.fetch = jest.fn(() =>
            Promise.resolve({ json: () => Promise.resolve({ data: { responseCode: 'G2P-T-0', transactionID: 'trans-123' } }) })
        );
        try {
            const result = await checkTransactionStatus(merchantId)
            mwTransaction(token, body, merchantId);

            expect(result).toEqual({
                message: 'Disbursement created successfully',
                merchantAmount: '5000',
                order_id: 'order-123',
                externalApiResponse: {
                    TransactionReference: 'trans-123',
                    TransactionStatus: 'success'
                }
            });
    
        } catch (error) {
            console.error("Disbursement created successfully", error);
        }
    
    });

    it('should fail if merchant is not found', async () => {
        merchantService.findOne.mockResolvedValue(null);
        try {
            const result = await mwTransaction(token, body, merchantId)
        } catch (error) {
            console.error("Merchant not found", error);
        }
    });
        

    it('should fail if disbursement account is missing', async () => {
        merchantService.findOne.mockResolvedValue({ merchant_id: 'merchant-123' });
        try {
            const result = await mwTransaction(token, body, merchantId)
        } catch (error) {
            console.error("Disbursement account not assigned.", error);
        }
    });
    it('should fail if order ID already exists', async () => {
        merchantService.findOne.mockResolvedValue({
            merchant_id: 'merchant-123',
            JazzCashDisburseAccountId: 'account-123'
        });
        prisma.disbursement.findFirst.mockResolvedValue({});
        try {
            const result = await mwTransaction(token, body, merchantId)
        } catch (error) {
            console.error("Order ID already exists", error);
        }
    });
});
