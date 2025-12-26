import jazzCashService from '../../../../dist/services/paymentGateway/jazzCash.js';
import prisma from "../../../../dist/prisma/client.js";
import axios from "axios";
import CustomError from "../../../../dist/utils/custom_error.js";
import { PROVIDERS } from "../../../../dist/constants/providers.js";

jest.mock("axios");
jest.mock("../../../../dist/prisma/client.js", () => ({
  merchant: {
    findFirst: jest.fn(),
  },
  transaction: {
    findFirst: jest.fn(),
  },
}));

beforeEach(() => {
  jest.clearAllMocks(); // Reset mock state before each test
  jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
  jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.error
});

afterEach(() => {
  console.error.mockRestore(); // Restore console.error after tests
});
describe("statusInquiry", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return transaction details for a valid payload and merchant", async () => {
    const payload = { transactionId: "TXN123" };
    const merchantId = "MERCHANT123";

    const mockMerchant = {
      uid: merchantId,
      merchant_id: 1,
      jazzCashMerchant: {
        jazzMerchantId: "JAZZ123",
        password: "password123",
        integritySalt: "salt123",
      },
    };

    const mockTransaction = {
      merchant_transaction_id: payload.transactionId,
      merchant_id: 1,
      original_amount: 1000,
      date_time: "2025-01-01T12:00:00Z",
      providerDetails: {
        msisdn: "923001234567",
      },
    };

    prisma.merchant.findFirst.mockResolvedValue(mockMerchant);
    prisma.transaction.findFirst.mockResolvedValue(mockTransaction);

    // Mock secure hash calculation
    const expectedSecureHash = "643a3b5fd0a391525c9573a7143bfb7a56cafcd6b17c019beb812f626ecc8060";

    axios.request.mockResolvedValue({
      data: {
        pp_ResponseCode: "000",
        pp_Status: "SUCCESS",
        pp_ResponseMessage: "Transaction successful",
        pp_PaymentResponseMessage: "Transaction successful",
      },
    });

    const result = await jazzCashService.statusInquiry(payload, merchantId);

    expect(prisma.merchant.findFirst).toHaveBeenCalledWith({
      where: { uid: merchantId },
      include: { jazzCashMerchant: true },
    });

    expect(prisma.transaction.findFirst).toHaveBeenCalledWith({
      where: {
        merchant_transaction_id: payload.transactionId,
        merchant_id: mockMerchant.merchant_id,
        providerDetails: {
          path: ["name"],
          equals: PROVIDERS.JAZZ_CASH,
        },
      },
    });

    expect(axios.request).toHaveBeenCalledWith({
      method: "post",
      maxBodyLength: Infinity,
      url: "https://payments.jazzcash.com.pk/ApplicationAPI/API/PaymentInquiry/Inquire",
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({
        pp_TxnRefNo: payload.transactionId,
        pp_MerchantID: mockMerchant.jazzCashMerchant.jazzMerchantId,
        pp_Password: mockMerchant.jazzCashMerchant.password,
        pp_SecureHash: expectedSecureHash,
      }),
    });

    expect(result).toEqual({
      orderId: payload.transactionId,
      transactionStatus: "SUCCESS",
      transactionAmount: mockTransaction.original_amount,
      transactionDateTime: mockTransaction.date_time,
      msisdn: mockTransaction.providerDetails?.msisdn,
      responseDesc: "Transaction successful",
      responseMode: "MA",
    });
  });

  it("should throw an error if merchant is not found", async () => {
    const payload = { transactionId: "TXN123" };
    const merchantId = "INVALID_MERCHANT";

    prisma.merchant.findFirst.mockResolvedValue(null);

    await expect(jazzCashService.statusInquiry(payload, merchantId)).rejects.toThrow(
      new CustomError("Merchant Not Found", 400)
    );

    expect(prisma.merchant.findFirst).toHaveBeenCalledWith({
      where: { uid: merchantId },
      include: { jazzCashMerchant: true },
    });
    expect(prisma.transaction.findFirst).not.toHaveBeenCalled();
  });

  it("should throw an error if transaction is not found", async () => {
    const payload = { transactionId: "INVALID_TXN" };
    const merchantId = "MERCHANT123";

    const mockMerchant = {
      uid: merchantId,
      merchant_id: 1,
      jazzCashMerchant: {
        jazzMerchantId: "JAZZ123",
        password: "password123",
        integritySalt: "salt123",
      },
    };

    prisma.merchant.findFirst.mockResolvedValue(mockMerchant);
    prisma.transaction.findFirst.mockResolvedValue(null);

    await expect(jazzCashService.statusInquiry(payload, merchantId)).rejects.toThrow(
      new CustomError("Transaction Not Found", 400)
    );

    expect(prisma.merchant.findFirst).toHaveBeenCalledWith({
      where: { uid: merchantId },
      include: { jazzCashMerchant: true },
    });
    expect(prisma.transaction.findFirst).toHaveBeenCalledWith({
      where: {
        merchant_transaction_id: payload.transactionId,
        merchant_id: mockMerchant.merchant_id,
        providerDetails: {
          path: ["name"],
          equals: PROVIDERS.JAZZ_CASH,
        },
      },
    });
  });

  it("should throw an error if the JazzCash API returns a non-success response code", async () => {
    const payload = { transactionId: "TXN123" };
    const merchantId = "MERCHANT123";

    const mockMerchant = {
      uid: merchantId,
      merchant_id: 1,
      jazzCashMerchant: {
        jazzMerchantId: "JAZZ123",
        password: "password123",
        integritySalt: "salt123",
      },
    };

    const mockTransaction = {
      merchant_transaction_id: payload.transactionId,
      merchant_id: 1,
      original_amount: 1000,
      date_time: "2025-01-01T12:00:00Z",
      providerDetails: {
        msisdn: "923001234567",
      },
    };

    prisma.merchant.findFirst.mockResolvedValue(mockMerchant);
    prisma.transaction.findFirst.mockResolvedValue(mockTransaction);

    axios.request.mockResolvedValue({
      data: {
        pp_ResponseCode: "001",
        pp_Status: "FAILED",
        pp_ResponseMessage: "Transaction failed",
        pp_PaymentResponseMessage: "Transaction failed",
      },
    });

    await expect(jazzCashService.statusInquiry(payload, merchantId)).resolves.toEqual({
      message: "Transaction Not Found",
      statusCode: 500,
    });
  });
});
