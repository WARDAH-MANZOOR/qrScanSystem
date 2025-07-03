import axios from "axios";
import prisma from "../../../../dist/prisma/client.js";
import transactionService from "../../../../dist/services/transactions/index.js";
import easyPaisaService from "../../../../dist/services/paymentGateway/easypaisa.js";

// Mock dependencies
jest.mock("axios");
jest.mock("../../../../dist/prisma/client.js", () => ({
  merchant: {
    findFirst: jest.fn(),
  },
  easyPaisaMerchant: {
    findFirst: jest.fn(),
  },
}));

jest.mock("../../../../dist/services/transactions/index.js", () => ({
  createTxn: jest.fn(),
  updateTxn: jest.fn(),
  sendCallback: jest.fn(),
  convertPhoneNumber: jest.fn(),
  createTransactionId: jest.fn(),
}));
beforeEach(() => {
  jest.clearAllMocks(); // Reset mock state before each test
  jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
  jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.error
});

afterEach(() => {
  console.error.mockRestore(); // Restore console.error after tests
});
describe("initiateEasyPaisa", () => {
  const mockParams = {
    phone: "03001234567",
    order_id: "order123",
    amount: 1000,
    email: "test@example.com",
    type: "payment",
  };
  

  it('should successfully process the transaction and return expected result', async () => {
    const merchantId = 'merchant123';
    const params = {
        phone: '1234567890',
        amount: 1000,
        email: 'test@example.com',
        order_id: 'order123',
        type: 'MA',
    };

    // Mocking the necessary services
    const mockMerchant = {
        uid: merchantId,
        easyPaisaMerchantId: 'easyPaisa123',
        commissions: [{
            commissionGST: 50,
            commissionRate: 20,
            commissionWithHoldingTax: 10,
            settlementDuration: 7,
        }],
    };

    const mockEasyPaisaMerchant = {
        id: 'easyPaisa123',
        storeId: 'store123',
        username: 'username',
        credentials: 'password',
    };

    const mockResponse = {
        data: {
            responseCode: '0000',
            responseDesc: 'Success',
        },
    };

    // Mocking prisma and transactionService methods
    prisma.merchant.findFirst = jest.fn().mockResolvedValue(mockMerchant);
    prisma.easyPaisaMerchant.findFirst = jest.fn().mockResolvedValue(mockEasyPaisaMerchant);
    transactionService.convertPhoneNumber = jest.fn().mockReturnValue('1234567890');
    transactionService.createTransactionId = jest.fn().mockReturnValue('txn123');
    axios.request = jest.fn().mockResolvedValue(mockResponse);
    transactionService.createTxn = jest.fn().mockResolvedValue({
        transaction_id: 'txn123',
        merchant_transaction_id: 'txn123',
        amount: 1000,
        status: 'pending',
        type: 'MA',
        date_time: new Date(),
    });
    transactionService.updateTxn = jest.fn().mockResolvedValue(true);
    transactionService.sendCallback = jest.fn().mockResolvedValue(true);

    const result = await easyPaisaService.initiateEasyPaisa(merchantId, params);

    // Assert the result
    expect(result.txnNo).toBeDefined();
    expect(result.statusCode).toBe('0000');
    expect(result.txnDateTime).toBeDefined();
    expect(transactionService.updateTxn).toHaveBeenCalledWith('txn123', {
        status: 'completed',
        response_message: 'Success',
    }, 7);
    expect(transactionService.sendCallback).toHaveBeenCalled();
});

  it("should throw an error if merchant ID is missing", async () => {
    const result = await easyPaisaService.initiateEasyPaisa("", mockParams);

    expect(result).toEqual({
      message: "Merchant ID is required",
      statusCode: 400,
      txnNo: undefined,
    });
  });

  it("should throw an error if merchant is not found", async () => {
    prisma.merchant.findFirst.mockResolvedValue(null);

    const result = await easyPaisaService.initiateEasyPaisa("nonexistentMerchant", mockParams);

    expect(result).toEqual({
      message: "Merchant not found",
      statusCode: 404,
      txnNo: undefined,
    });
  });

  it("should throw an error if EasyPaisa merchant is not found", async () => {
    prisma.merchant.findFirst.mockResolvedValue({
      uid: "merchant123",
      easyPaisaMerchantId: 1,
    });
    prisma.easyPaisaMerchant.findFirst.mockResolvedValue(null);

    const result = await easyPaisaService.initiateEasyPaisa("merchant123", mockParams);

    expect(result).toEqual({
      message: "Gateway merchant not found",
      statusCode: 404,
      txnNo: undefined,
    });
  });

  it('should handle EasyPaisa API error response', async () => {
    const params = { amount: 1000, phone: '1234567890', email: 'test@domain.com' };
    const merchantId = 'validMerchantId';
  
    prisma.merchant.findFirst.mockResolvedValue({
      easyPaisaMerchantId: 'easyPaisaId',
      commissions: [{ commissionGST: 10, commissionRate: 5, commissionWithHoldingTax: 2, settlementDuration: 7 }]
    });
    prisma.easyPaisaMerchant.findFirst.mockResolvedValue({
      storeId: 'store123',
      username: 'username',
      credentials: 'password'
    });
    transactionService.convertPhoneNumber.mockReturnValue('1234567890');
    transactionService.createTransactionId.mockReturnValue('txn123');
    axios.request.mockResolvedValue({ data: { responseCode: '9999', responseDesc: 'SYSTEM ERROR' } });
  
    const result = await easyPaisaService.initiateEasyPaisa(merchantId, params);
  
    expect(result.message).toBe('User did not respond');
    expect(result.statusCode).toBe(500);
  });
  
});
