import jazzCashService from '../../../../dist/services/paymentGateway/jazzCash.js';
import axios from 'axios';
import prisma from '../../../../dist/prisma/client.js';
import { CustomError } from '../../../../dist/utils/custom_error.js';
import { transactionService } from "../../../../dist/services/transactions/index.js";

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
    },
    $transaction: jest.fn()
  }));
  

jest.mock('../../../../dist/services/transactions/index.js', () => ({
  convertPhoneNumber: jest.fn().mockReturnValue('03022082257'),
}));

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

describe('initiateJazzCashPayment', () => {
    // Sample payment data
    const paymentData = {
      amount: '100',
      phone: '03022082257',
      redirect_url: 'https://example.com',
      type: 'WALLET',
    };
  
    const merchant_uid = 'merchant123';
    beforeAll(() => {
        jest.spyOn(console, 'log').mockImplementation(() => {}); // Mock console.log
        jest.spyOn(console, 'error').mockImplementation(() => {}); // Mock console.error
      });
      
      afterAll(() => {
        console.log.mockRestore(); // Restore original console.log
        console.error.mockRestore(); // Restore original console.error
      });
    
    // Test for missing amount or phone
    it('should throw error if amount or phone is missing', async () => {
      const invalidData = { ...paymentData, amount: undefined };
      try {
        await jazzCashService.initiateJazzCashPayment(invalidData, merchant_uid);
      } catch (error) {
        expect(error).toBeInstanceOf(CustomError);
        expect(error.message).toBe('Amount and phone are required');
        expect(error.statusCode).toBe(400);
      }
    });
  
    // Test for missing redirect URL
    it('should throw error if redirect URL is missing', async () => {
      const invalidData = { ...paymentData, redirect_url: undefined };
      try {
        await jazzCashService.initiateJazzCashPayment(invalidData, merchant_uid);
      } catch (error) {
        expect(error).toBeInstanceOf(CustomError);
        expect(error.message).toBe('Redirect URL is required');
        expect(error.statusCode).toBe(400);
      }
    });
  
    // Test for missing payment type
    it('should throw error if payment type is missing', async () => {
      const invalidData = { ...paymentData, type: undefined };
      try {
        await jazzCashService.initiateJazzCashPayment(invalidData, merchant_uid);
      } catch (error) {
        expect(error).toBeInstanceOf(CustomError);
        expect(error.message).toBe('Payment type is required');
        expect(error.statusCode).toBe(400);
      }
    });
  
    // Test for merchant not found
    it('should throw error if merchant is not found', async () => {
      jest.spyOn(prisma.merchant, 'findFirst').mockResolvedValue(null);
      try {
        await jazzCashService.initiateJazzCashPayment(paymentData, merchant_uid);
      } catch (error) {
        expect(error).toBeInstanceOf(CustomError);
        expect(error.message).toBe('Merchant not found');
        expect(error.statusCode).toBe(404);
      }
    });
  
    // Test for JazzCash merchant not found
    it('should throw error if JazzCash merchant is not found', async () => {
      jest.spyOn(prisma.merchant, 'findFirst').mockResolvedValue({ jazzCashMerchantId: 'some-id' });
      jest.spyOn(prisma.jazzCashMerchant, 'findFirst').mockResolvedValue(null);
      try {
        await jazzCashService.initiateJazzCashPayment(paymentData, merchant_uid);
      } catch (error) {
        expect(error).toBeInstanceOf(CustomError);
        expect(error.message).toBe('Payment Merchant not found');
        expect(error.statusCode).toBe(404);
      }
    });
  
    // Test for existing transaction with matching transaction ID
    it('should handle existing transaction with matching transaction_id', async () => {
      jest.spyOn(prisma.merchant, 'findFirst').mockResolvedValue({ jazzCashMerchantId: 'some-id' });
      jest.spyOn(prisma.jazzCashMerchant, 'findFirst').mockResolvedValue({});
      jest.spyOn(prisma.transaction, 'findUnique').mockResolvedValue({ status: 'pending' });
  
      const result = await jazzCashService.initiateJazzCashPayment(paymentData, merchant_uid);
      expect(result).toHaveProperty('txnNo');
    });
  

        // Test for failed payment response from JazzCash
    it('should handle failed payment response from JazzCash', async () => {
      jest.spyOn(prisma.merchant, 'findFirst').mockResolvedValue({ jazzCashMerchantId: 'some-id' });
      jest.spyOn(prisma.jazzCashMerchant, 'findFirst').mockResolvedValue({
        jazzMerchantId: '123',
        password: 'pass',
        returnUrl: 'https://example.com',
      });
  
      axios.post.mockResolvedValue({
        data: { pp_ResponseCode: '123', pp_ResponseMessage: 'Failure' }
      });
  
      try {
        await jazzCashService.initiateJazzCashPayment(paymentData, merchant_uid);
      } catch (error) {
        expect(error).toBeInstanceOf(CustomError);
        expect(error.message).toBe('The payment failed because: 【123 Failure】');
        expect(error.statusCode).toBe(400);
      }
    });
  
    // Test for unexpected errors
    it('should handle unexpected errors', async () => {
      jest.spyOn(prisma.merchant, 'findFirst').mockResolvedValue({ jazzCashMerchantId: 'some-id' });
      jest.spyOn(prisma.jazzCashMerchant, 'findFirst').mockResolvedValue({
        jazzMerchantId: '123',
        password: 'pass',
        returnUrl: 'https://example.com',
      });
      jest.spyOn(prisma.transaction, 'findUnique').mockRejectedValue(new Error('Unexpected error'));
  
      try {
        await jazzCashService.initiateJazzCashPayment(paymentData, merchant_uid);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Unexpected error');
      }
    });
  });
  