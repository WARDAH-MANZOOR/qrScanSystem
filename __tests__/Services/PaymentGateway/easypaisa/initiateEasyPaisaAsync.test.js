import easyPaisaService from "../../../../dist/services/paymentGateway/easypaisa.js";
import prisma from "../../../../dist/prisma/client.js";
import transactionService from "../../../../dist/services/transactions/index.js";
import axios from "axios";

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
jest.mock("axios");
beforeEach(() => {
  jest.clearAllMocks(); // Reset mock state before each test
  jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
  jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.error
});

afterEach(() => {
  console.error.mockRestore(); // Restore console.error after tests
});
describe("initiateEasyPaisaAsync", () => {
    let mockMerchant, mockEasyPaisaMerchant, mockTransaction;
  
    beforeEach(() => {
      jest.clearAllMocks();
  
      mockMerchant = {
        merchant_id: "12345",
        easyPaisaMerchantId: 1,
        commissions: [{
          commissionGST: 5,
          commissionRate: 10,
          commissionWithHoldingTax: 2,
          settlementDuration: 3,
        }],
        webhook_url: "http://example.com/callback",
      };
  
      mockEasyPaisaMerchant = {
        id: 1,
        storeId: "store123",
        username: "user",
        credentials: "password",
      };
  
      mockTransaction = {
        transaction_id: "txn12345",
        date_time: new Date().toISOString(),
        status: "pending",
      };
    });
  
    it("should throw an error if merchant ID is missing", async () => {
      const result = await easyPaisaService.initiateEasyPaisaAsync(null, {});
      expect(result).toEqual({
        message: "Merchant ID is required",
        statusCode: 400,
        txnNo: null,
      });
    });
  
    it("should throw an error if merchant is not found", async () => {
      prisma.merchant.findFirst.mockResolvedValue(null);
  
      const result = await easyPaisaService.initiateEasyPaisaAsync("invalidId", {});
      expect(result).toEqual({
        message: "Merchant not found",
        statusCode: 404,
        txnNo: null,
      });
    });
  
    it("should throw an error if EasyPaisa merchant is not found", async () => {
      prisma.merchant.findFirst.mockResolvedValue(mockMerchant);
      prisma.easyPaisaMerchant.findFirst.mockResolvedValue(null);
  
      const result = await easyPaisaService.initiateEasyPaisaAsync("12345", {});
      expect(result).toEqual({
        message: "Gateway merchant not found",
        statusCode: 404,
        txnNo: null,
      });
    });
  
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
  
      // Run the function
      const result = await easyPaisaService.initiateEasyPaisaAsync(merchantId, params);
  
      // Await setImmediate to ensure completion of the async callback
      await new Promise((resolve) => setImmediate(resolve));
  
      // Assert the result
      expect(result.txnNo).toBeDefined();
      expect(result.statusCode).toBe('pending');
      expect(result.txnDateTime).toBeDefined();
      expect(transactionService.updateTxn).toHaveBeenCalledWith('txn123', {
        status: 'completed',
        response_message: 'Success',
      }, 7);
      expect(transactionService.sendCallback).toHaveBeenCalled();
    });
    it("should handle EasyPaisa API failure gracefully", async () => {
      prisma.merchant.findFirst.mockResolvedValue(mockMerchant);
      prisma.easyPaisaMerchant.findFirst.mockResolvedValue(mockEasyPaisaMerchant);
      transactionService.convertPhoneNumber.mockReturnValue("03001234567");
      transactionService.createTransactionId.mockReturnValue("txn12345");
      transactionService.createTxn.mockResolvedValue(mockTransaction);
  
      axios.request.mockResolvedValue({
          data: { responseCode: "1000", responseDesc: "Failure" },
      });
  
      // Call the function
      const result = await easyPaisaService.initiateEasyPaisaAsync("12345", {
          phone: "03001234567",
          amount: 1000,
          type: "payin",
          email: "test@example.com",
      });
  
      // Wait for the immediate callback to be executed
      await new Promise((resolve) => setImmediate(resolve));
  
      // Ensure updateTxn was called with the expected parameters for failure
      expect(transactionService.updateTxn).toHaveBeenCalledWith(
          "txn12345",
          { status: "failed", response_message: "Failure" },
          mockMerchant.commissions[0].settlementDuration
      );
    });
  
    it("should handle errors during the API call gracefully", async () => {
      prisma.merchant.findFirst.mockResolvedValue(mockMerchant);
      prisma.easyPaisaMerchant.findFirst.mockResolvedValue(mockEasyPaisaMerchant);
      transactionService.convertPhoneNumber.mockReturnValue("03001234567");
      transactionService.createTransactionId.mockReturnValue("txn12345");
      transactionService.createTxn.mockResolvedValue(mockTransaction);
  
      axios.request.mockRejectedValue(new Error("Network Error"));
  
      const result = await easyPaisaService.initiateEasyPaisaAsync("12345", {
          phone: "03001234567",
          amount: 1000,
          type: "payin",
          email: "test@example.com",
      });
  
      // Wait for the immediate callback to be executed
      await new Promise((resolve) => setImmediate(resolve));
  
      // Ensure updateTxn was called with the expected parameters for error case
      expect(transactionService.updateTxn).toHaveBeenCalledWith(
          "txn12345",

          { status: "failed", response_message: "Network Error" },
          mockMerchant.commissions[0].settlementDuration
      );
    });
  });
  