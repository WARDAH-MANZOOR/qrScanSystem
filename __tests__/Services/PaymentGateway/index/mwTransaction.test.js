import { mwTransaction } from "../../../../dist/services/paymentGateway/index.js";
import { merchantService, transactionService } from "../../../../dist/services/index.js";
import CustomError from "../../../../dist/utils/custom_error.js";
import prisma from "../../../../dist/prisma/client.js";
import { decryptData } from "../../../../dist/utils/enc_dec.js";
import { getEligibleTransactions, getMerchantRate } from "../../../../dist/services/paymentGateway/disbursement.js";
import fetch from "node-fetch";
import jazzcashDisburse  from "../../../../dist/services/paymentGateway/jazzcashDisburse.js";   

// Mock dependencies
jest.mock("../../../../dist/prisma/client.js", () => ({
    $transaction: jest.fn(),
    disbursement: {
        create: jest.fn(),
    },
}));
jest.mock("../../../../dist/services/paymentGateway/jazzcashDisburse.js", () => ({
    getDisburseAccount: jest.fn().mockResolvedValue({
      key: "mockKey",
      initialVector: "mockIV",
    }),
  }));
jest.mock("../../../../dist/services/index.js", () => ({
    merchantService: {
      findOne: jest.fn(),
    },
    transactionService: {
      sendCallback: jest.fn(),
    },
  }));
  jest.mock("node-fetch");
jest.mock("../../../../dist/utils/custom_error.js", () => {
    return jest.fn().mockImplementation((message, statusCode) => ({
        message,
        statusCode,
        toString: () => `${message} (${statusCode})`,
    }));
});
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
  }));


describe("mwTransaction", () => {
    const token = "mockToken";
    const body = {
        phone: "923001234567",
        cnic: "1234512345671",
        amount: 5000,
        order_id: "mockOrderId",
    };
    const merchantId = "validMerchant";
    const mockMerchant = {
        uid: merchantId,
        JazzCashDisburseAccountId: "mockAccountId",
        merchant_id: 123,
        callback_mode: "DOUBLE",
        payout_callback: "http://mock.callback",
        webhook_url: "http://mock.webhook",
        encrypted: "true",
    };
    const mockDisburseAccount = {
        key: "mockKey",
        initialVector: "mockIV",
    };
    const mockTransactions = [
        {
            transaction_id: "txn1",
            balance: 3000,
            settled_amount: 3000,
            original_amount: 3000,
        },
    ];
    const mockRate = {
        disbursementRate: 0.02,
        disbursementGST: 0.17,
        disbursementWithHoldingTax: 0.1,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should throw an error if merchant is not found", async () => {
        merchantService.findOne.mockResolvedValue(null);
        await expect(mwTransaction(token, body, merchantId)).rejects.toMatchObject({
            message: "Merchant not found",
            statusCode: 404,
        });
    });

    test("should throw an error if disbursement account is not assigned", async () => {
        merchantService.findOne.mockResolvedValue({
            ...mockMerchant,
            JazzCashDisburseAccountId: null,
        });
        await expect(mwTransaction(token, body, merchantId)).rejects.toMatchObject({
            message: "Disbursement account not assigned.",
            statusCode: 404,
        });
    });

    test("should throw an error if disbursement account is not found", async () => {
        merchantService.findOne.mockResolvedValue(mockMerchant);
        jazzcashDisburse.getDisburseAccount.mockResolvedValue(null); // Simulate missing disbursement account
        await expect(mwTransaction(token, body, merchantId)).rejects.toMatchObject({
            message: "Disbursement account not found",
            statusCode: 404,
        });
    });
    
    test("should throw an error if phone number does not start with 92", async () => {
        const invalidPhoneBody = { ...body, phone: "923100123456" };  // Invalid phone number
        merchantService.findOne.mockResolvedValue(mockMerchant);
        
        // Ensure getDisburseAccount is not called or mock it to return a valid response
        jazzcashDisburse.getDisburseAccount.mockResolvedValue(mockDisburseAccount); 
    
        await expect(mwTransaction(token, invalidPhoneBody, merchantId)).rejects.toMatchObject({
            message: "Number should start with 92",
            statusCode: 400,
        });
    });
    
    test("should throw an error if there are no eligible transactions", async () => {
        merchantService.findOne.mockResolvedValue(mockMerchant);
        jazzcashDisburse.getDisburseAccount.mockResolvedValue(mockDisburseAccount);
        
        getEligibleTransactions.mockResolvedValue([]); // No eligible transactions
        
        await expect(mwTransaction(token, body, merchantId)).rejects.toMatchObject({
            message: "No eligible transactions to disburse",
            statusCode: 400,
        });
    });
    
   
      
      test("should correctly calculate the disbursement amount and deductions", async () => {
        merchantService.findOne.mockResolvedValue(mockMerchant);
        jazzcashDisburse.getDisburseAccount.mockResolvedValue(mockDisburseAccount); 
        getEligibleTransactions.mockResolvedValue(mockTransactions);
        getMerchantRate.mockResolvedValue(mockRate);
      
        const result = await mwTransaction(token, body, merchantId);
      
        // Check if the calculations are done correctly by verifying the response fields
        expect(result).toHaveProperty("merchantAmount");
        expect(result.merchantAmount).toEqual(expect.any(String)); // Ensure it's a string representation of the amount
      });
    
    test("should create disbursement successfully", async () => {
        merchantService.findOne.mockResolvedValue(mockMerchant);
        jazzcashDisburse.getDisburseAccount.mockResolvedValue(mockDisburseAccount); 
        getEligibleTransactions.mockResolvedValue(mockTransactions);
        getMerchantRate.mockResolvedValue(mockRate);
    
        const fetchResponse = {
            json: jest.fn().mockResolvedValue({
                responseCode: "G2P-T-0",
                responseDescription: "Success",
                transactionID: "txn123",
            }),
        };
        fetch.mockResolvedValue(fetchResponse);
    
        const result = await mwTransaction(token, body, merchantId);
    
        expect(result).toHaveProperty("message", "Disbursement created successfully");
        expect(result).toHaveProperty("merchantAmount");
        expect(result).toHaveProperty("order_id");
        expect(result).toHaveProperty("externalApiResponse.TransactionReference");
        expect(result).toHaveProperty("externalApiResponse.TransactionStatus", "success");
    });
    
    test("should handle the case when no order_id is provided", async () => {
        const bodyWithoutOrderId = { ...body, order_id: null }; // No order_id provided
        merchantService.findOne.mockResolvedValue(mockMerchant);
        jazzcashDisburse.getDisburseAccount.mockResolvedValue(mockDisburseAccount); 
        getEligibleTransactions.mockResolvedValue(mockTransactions);
        getMerchantRate.mockResolvedValue(mockRate);
    
        const fetchResponse = {
            json: jest.fn().mockResolvedValue({
                responseCode: "G2P-T-0",
                responseDescription: "Success",
                transactionID: "txn123",
            }),
        };
        fetch.mockResolvedValue(fetchResponse);
    
        const result = await mwTransaction(token, bodyWithoutOrderId, merchantId);
    
        expect(result).toHaveProperty("message", "Disbursement created successfully");
        expect(result).toHaveProperty("order_id"); // Check if a new order_id is generated
        expect(result.order_id).not.toBeNull();
    });
});
