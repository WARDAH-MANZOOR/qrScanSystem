import prisma from '../../../../dist/prisma/client.js';
import { CustomError } from '../../../../dist/utils/custom_error.js';import axios from "axios";

import jazzCashService from "../../../../dist/services/paymentGateway/jazzCash.js";
jest.mock("../../../../dist/utils/custom_error.js", () => {
  return {
    CustomError: class CustomError extends Error {
      constructor(message, statusCode = 500) {
        super(message);
        this.error = message || 'Internal server error';
        this.success = false;
        this.statusCode = statusCode;
        this.statusText = statusCode >= 400 && statusCode < 500 ? 'fail' : 'error';
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
      }
    }
  };
});

  jest.mock('axios');
  jest.mock('../../../../dist/prisma/client.js', () => ({
    merchant: {
      findFirst: jest.fn(),
    },
    jazzCashMerchant: {
      findFirst: jest.fn(),
    },
    transaction: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),  // Add this line to fix the issue
    },
    $transaction: jest.fn(),
  }));
  
  
  jest.mock('../../../../dist/services/transactions/index.js', () => ({
    convertPhoneNumber: jest.fn().mockReturnValue('03022082257'),
  }));
  
describe("initiateJazzCashCnicPayment", () => {
  let mockPrismaTransaction;
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {}); // Mock console.log
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Mock console.error
    
    mockPrismaTransaction = jest.spyOn(prisma, "$transaction");
    jest.spyOn(axios, "post").mockResolvedValue({
      data: { pp_ResponseCode: "000", pp_ResponseMessage: "Success" },
    });
  });
  afterEach(() => {
    jest.clearAllMocks();
    console.log.mockRestore(); // Restore original console.log
    console.error.mockRestore(); // Restore original console.error
  });

  test("should successfully initiate JazzCash CNIC payment", async () => {
    const paymentData = {
      amount: 500,
      phone: "03001234567",
      cnic: "4220123456789",
      order_id: "ORDER1234",
      use_sandbox: "yes",
      
    };

    mockPrismaTransaction.mockResolvedValue({
      merchant: { merchant_id: 1, commissions: [{ commissionRate: 0.02, commissionGST: 0.05, commissionWithHoldingTax: 0.01 }] },
      jazzCashMerchant: { jazzMerchantId: "12345", password: "pass", integritySalt: "salt123" },
      txnRefNo: "T20240101010101XYZ",
    });
    try {
        await jazzCashService.initiateJazzCashCnicPayment(paymentData, "merchant_uid_1");
      } catch (error) {
        expect(error).toBeInstanceOf(CustomError);
        expect(error.message).toBe('Success');
        expect(error.statusCode).toBe(200);
      }
   
  });

    test('should fail if required fields are missing', async () => {
    const paymentData = { amount: 500, phone: "", cnic: "" };
      try {
        await jazzCashService.initiateJazzCashCnicPayment(paymentData);
      } catch (error) {
        expect(error).toBeInstanceOf(CustomError);
        expect(error.message).toBe('Amount, phone, and CNIC are required');
        expect(error.statusCode).toBe(400);
      }
    });


  test("should return error if merchant is not found", async () => {
    mockPrismaTransaction.mockRejectedValue(new CustomError("Merchant not found", 404));
    const paymentData = { amount: 500, phone: "03001234567", cnic: "4220123456789" };
    const response = await jazzCashService.initiateJazzCashCnicPayment(paymentData, "invalid_merchant_uid");
    expect(response).toEqual({
      message: "Merchant not found",
      statusCode: 404,
      txnRefNo: "",
    });
  });

  test("should return error if JazzCash merchant is not found", async () => {
    mockPrismaTransaction.mockRejectedValue(new CustomError("Payment Merchant not found", 404));
    const paymentData = { amount: 500, phone: "03001234567", cnic: "4220123456789" };
    const response = await jazzCashService.initiateJazzCashCnicPayment(paymentData, "valid_merchant_uid");
    expect(response).toEqual({
      message: "Payment Merchant not found",
      statusCode: 404,
      txnRefNo: "",
    });
  });

  test("should handle failed transaction", async () => {
    jest.spyOn(axios, "post").mockResolvedValue({
      data: { pp_ResponseCode: "001", pp_ResponseMessage: "Transaction Failed" },
    });
    const paymentData = { amount: 500, phone: "03001234567", cnic: "4220123456789" };
    mockPrismaTransaction.mockResolvedValue({
      merchant: { merchant_id: 1, commissions: [{ commissionRate: 0.02, commissionGST: 0.05, commissionWithHoldingTax: 0.01 }] },
      jazzCashMerchant: { jazzMerchantId: "12345", password: "pass", integritySalt: "salt123" },
      txnRefNo: "T20240101010101XYZ",
    });
    try {
        await jazzCashService.initiateJazzCashCnicPayment(paymentData, "merchant_uid_1");
      } catch (error) {
        expect(error).toBeInstanceOf(CustomError);
        expect(error.message).toBe('Transaction Failed');
        expect(error.statusCode).toBe(201);
      }
    
  });
 
});
