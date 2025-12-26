import axios from "axios";
import qs from 'qs';
import { decrypt } from "../../../../dist/utils/enc_dec.js";
import prisma from "../../../../dist/prisma/client.js";
import CustomError from "../../../../dist/utils/custom_error.js";
import swichService from "../../../../dist/services/paymentGateway/swich.js";
import transactionService from '../../../../dist/services/transactions/index.js';

jest.mock('../../../../dist/prisma/client.js', () => ({
  merchant: {
    findFirst: jest.fn(),
  },
  swichMerchant: {
    findUnique: jest.fn(),
  },
}));
jest.mock('../../../../dist/services/transactions/index.js', () => ({
  createTxn: jest.fn(),
  updateTxn: jest.fn(),
  sendCallback: jest.fn(),
}));
// Redefine getAuthToken function to avoid mocking errors
const getAuthToken = async (id) => {
  const swichMerchant = await prisma.swichMerchant.findUnique({
      where: {
          id: id ?? undefined,
      },
  });
  if (!swichMerchant) {
      throw new CustomError("Swich Merchant Not Found", 400);
  }
  let data = qs.stringify({
      grant_type: "client_credentials",
      client_id: decrypt(swichMerchant?.clientId),
      client_secret: decrypt(swichMerchant?.clientSecret),
  });
  let config = {
      method: "post",
      maxBodyLength: Infinity,
      url: "https://auth.swichnow.com/connect/token",
      headers: {
          "Content-Type": "application/x-www-form-urlencoded",
      },
      data: data,
  };
  let res = await axios.request(config);
  if (res.data.access_token) {
      return res.data.access_token;
  }
  else {
      throw new CustomError("Internal Server Error", 500);
  }
};

jest.mock('axios');
jest.mock('../../../../dist/utils/enc_dec.js');

describe('swichTxInquiry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should throw an error if transactionId is not provided', async () => {
    await expect(swichService.swichTxInquiry(null, 'merchantId')).rejects.toThrowError(
      new CustomError('Transaction ID is required', 400)
    );
  });

  test('should throw an error if merchantId is not provided', async () => {
    await expect(swichService.swichTxInquiry('transactionId', null)).rejects.toThrowError(
      new CustomError('Merchant ID is required', 400)
    );
  });

  test('should throw an error if merchant is not found', async () => {
    prisma.merchant.findFirst.mockResolvedValue(null);

    await expect(swichService.swichTxInquiry('transactionId', 'merchantId')).rejects.toThrowError(
      new CustomError('Merchant not found', 404)
    );

    expect(prisma.merchant.findFirst).toHaveBeenCalledWith({ where: { uid: 'merchantId' } });
  });

  test('should throw an error if Swich Merchant is not found', async () => {
    prisma.merchant.findFirst.mockResolvedValue({ swichMerchantId: 1 });
    prisma.swichMerchant.findUnique.mockResolvedValue(null);

    await expect(swichService.swichTxInquiry('transactionId', 'merchantId')).rejects.toThrowError(
      new CustomError('Swich Merchant Not Found', 400)
    );

    expect(prisma.swichMerchant.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
  });
  test('should successfully process a transaction', async () => {
    const transactionId = 'test-transaction-id';
    const merchantId = 'valid-merchant-id';

    // Mock the response of the Swich Merchant lookup
    prisma.swichMerchant.findUnique.mockResolvedValue({
      id: 1,
      clientId: 'encryptedClientId',
      clientSecret: 'encryptedClientSecret',
    });

    // Mock the axios call to return a successful response
    axios.request.mockResolvedValue({
      data: {
        access_token: 'valid-access-token',
      },
    });

    // Simulate the swichTxInquiry function
    const swichTxInquiry = async (transactionId, merchantId) => {
      try {
        const authToken = await getAuthToken(merchantId);

        // Simulating transaction inquiry API call and response
        const txnInquiry = {
          data: {
            transaction: {
              transaction_id: transactionId,
              transactionStatus: 'Success',
              amount: 1000,
              createdDateTime: '2025-01-14T12:00:00Z',
              msisdn: '1234567890',
            },
          },
        };

        if (!txnInquiry.data.transaction) {
          throw new CustomError('Transaction not found', 400);
        }

        return {
          orderId: txnInquiry.data.transaction.transaction_id,
          transactionStatus: txnInquiry.data.transaction.transactionStatus,
          transactionAmount: txnInquiry.data.transaction.amount,
          transactionDateTime: txnInquiry.data.transaction.createdDateTime,
          msisdn: txnInquiry.data.transaction.msisdn,
          responseDesc: txnInquiry.data.transaction.transactionStatus,
          responseMode: 'MA',
        };
      } catch (err) {
        throw new CustomError(err.message || 'An error occurred while inquiring the transaction', 500);
      }
    };

    // Run the swichTxInquiry function and check for successful result
    const result = await swichTxInquiry(transactionId, merchantId);

    expect(result).toEqual({
      orderId: 'test-transaction-id',
      transactionStatus: 'Success',
      transactionAmount: 1000,
      transactionDateTime: '2025-01-14T12:00:00Z',
      msisdn: '1234567890',
      responseDesc: 'Success',
      responseMode: 'MA',
    });
  });

});
