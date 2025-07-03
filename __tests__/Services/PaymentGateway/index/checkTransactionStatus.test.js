import { checkTransactionStatus } from '../../../../dist/services/paymentGateway/index.js';
import CustomError from "../../../../dist/utils/custom_error.js";
import prisma from "../../../../dist/prisma/client.js";
import fetch from 'node-fetch';
import { encryptData, decryptData } from '../../../../dist/utils/enc_dec.js';
import jazzcashDisburse from '../../../../dist/services/paymentGateway/jazzcashDisburse.js';
import { transactionService } from "../../../../dist/services/index.js";

jest.mock('node-fetch');
jest.mock('../../../../dist/prisma/client.js', () => ({
    findOne: jest.fn(),
    disbursement: {
        findFirst: jest.fn()
    }
}));
jest.mock('../../../../dist/utils/enc_dec.js');
jest.mock('../../../../dist/services/paymentGateway/jazzcashDisburse.js');
jest.mock('../../../../dist/services/index.js');
beforeEach(() => {
    jest.clearAllMocks(); // Reset mock state before each test
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
    jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.error
});

  afterEach(() => {
    console.error.mockRestore(); // Restore console.error after tests
  });
describe('checkTransactionStatus', () => {
    let token;
    let body;
    let merchantId;

    beforeEach(() => {
        token = 'valid-token';
        body = { transactionIds: ['txn123', 'txn456'] };
        merchantId = 'merchant123';
    });

    it('should throw an error if merchant is not found', async () => {
        prisma.findOne = jest.fn().mockResolvedValue(null); // Merchant not found

        await expect(checkTransactionStatus(token, body, merchantId))
            .rejects
            .toThrow(new CustomError("Merchant not found", 404));
    });

    it('should throw an error if disbursement account is not assigned', async () => {
        try {
            const result = await checkTransactionStatus(token, body, merchantId)
        } catch (error) {
            console.error("Disbursement account not assigned.", error);
        }
    });
           
    it("should throw an error if disbursement account is not found", async () => {
        prisma.findOne.mockResolvedValue({ uid: "merchantId", JazzCashDisburseAccountId: "accountId" });
        jazzcashDisburse.getDisburseAccount.mockResolvedValue(null);
        try {
            const result = await checkTransactionStatus(merchantId)
        } catch (error) {
            console.error("Disbursement account not found", error);
        }
    });
    it('should return "Transaction not found" if transaction is not found in database', async () => {
        const findMerchant = { uid: merchantId, JazzCashDisburseAccountId: 'account-id' };
        prisma.findOne = jest.fn().mockResolvedValue(findMerchant);
        jazzcashDisburse.getDisburseAccount = jest.fn().mockResolvedValue({ data: { key: 'key', initialVector: 'vector' } });
        prisma.disbursement.findFirst = jest.fn().mockResolvedValue(null); // Transaction not found
        try {
            const result = await checkTransactionStatus(token, body, merchantId);

            expect(result).toEqual([
                { id: 'txn123', status: 'Transaction not found' },
                { id: 'txn456', status: 'Transaction not found' }
            ]);
        } catch (error) {
            console.error("Error", error);
        }
    });

    it('should return transaction status from JazzCash API if transaction is found', async () => {
        const findMerchant = { uid: merchantId, JazzCashDisburseAccountId: 'account-id' };
        prisma.findOne = jest.fn().mockResolvedValue(findMerchant);
        jazzcashDisburse.getDisburseAccount = jest.fn().mockResolvedValue({ data: { key: 'key', initialVector: 'vector' } });
        prisma.disbursement.findFirst = jest.fn().mockResolvedValue({ transaction_id: 'txn123' });

        const mockApiResponse = { data: { responseCode: 'G2P-T-0', responseDescription: 'Success' } };
        fetch.mockResolvedValueOnce({ json: jest.fn().mockResolvedValue(mockApiResponse) });
        try {
            const result = await checkTransactionStatus(token, body, merchantId);

            expect(result).toEqual([
                { id: 'txn123', status: mockApiResponse.data },
                { id: 'txn456', status: 'Transaction not found' }
            ]);


        } catch (error) {
            console.error(" Error:", error);
        }
    });

    it('should handle error if there is an issue with the API request', async () => {
        const findMerchant = { uid: merchantId, JazzCashDisburseAccountId: 'account-id' };
        prisma.findOne = jest.fn().mockResolvedValue(findMerchant);
        jazzcashDisburse.getDisburseAccount = jest.fn().mockResolvedValue({ data: { key: 'key', initialVector: 'vector' } });
        prisma.disbursement.findFirst = jest.fn().mockResolvedValue({ transaction_id: 'txn123' });

        const mockError = new Error('Network issue');
        fetch.mockRejectedValueOnce(mockError);
        try {
            const result = await checkTransactionStatus(token, body, merchantId);

            expect(result).toEqual([
                { id: 'txn123', status: null, error: 'Network issue' },
                { id: 'txn456', status: 'Transaction not found' }
            ]);

        } catch (error) {
            console.error(" Error:", error);
        }
    });
});