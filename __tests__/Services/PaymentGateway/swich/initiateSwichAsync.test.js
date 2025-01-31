import axios from "axios";
import prisma from "../../../../dist/prisma/client.js";
import transactionService from "../../../../dist/services/transactions/index.js";
import swichService from "../../../../dist/services/paymentGateway/swich.js";
import CustomError from "../../../../dist/utils/custom_error.js";

jest.mock("axios");
jest.mock("../../../../dist/prisma/client.js", () => ({
  merchant: {
    findFirst: jest.fn(),
  },
}));
jest.mock("../../../../dist/services/transactions/index.js", () => ({
  createTxn: jest.fn(),
  updateTxn: jest.fn(),
  sendCallback: jest.fn(),
  createTransactionId: jest.fn(),
}));

describe("initiateSwichAsync", () => {
  const mockParams = {
    phone: "03001234567",
    order_id: "order123",
    amount: 1000,
    email: "test@example.com",
    type: "payment",
    channel: 5649, // Assuming Jazz Cash (5649)
  };

  const mockMerchant = {
    uid: "merchant123",
    merchant_id: 1,
    swichMerchantId: 1,
    commissions: [{
      commissionGST: 10,
      commissionRate: 5,
      commissionWithHoldingTax: 2,
      settlementDuration: 2,
    }],
    webhook_url: "http://webhook.url",
  };

  const mockAuthToken = "mockAuthToken";

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  it("should successfully initiate the transaction and return the txn details", async () => {
    prisma.merchant.findFirst.mockResolvedValue(mockMerchant);
    transactionService.createTransactionId.mockReturnValue("txn123");
    transactionService.createTxn.mockResolvedValue({
      transaction_id: "txn123",
      date_time: "2024-12-16T12:00:00Z",
      merchant_transaction_id: "txn123",
    });
    axios.request.mockResolvedValue({
      data: { code: "0000", message: "Transaction successful" },
    });
    swichService.getAuthToken = jest.fn().mockResolvedValue(mockAuthToken);

    const result = await swichService.initiateSwichAsync(mockParams, "merchant123");

    expect(result).toEqual({
      txnNo: "txn123",
      txnDateTime: "2024-12-16T12:00:00Z",
      statusCode: "pending",
    });
    expect(transactionService.createTxn).toHaveBeenCalled();
    expect(transactionService.updateTxn).toHaveBeenCalledWith(
      "txn123",
      { status: "completed", response_message: "Transaction successful" },
      2
    );
    expect(transactionService.sendCallback).toHaveBeenCalledWith(
      "http://webhook.url",
      expect.objectContaining({ transaction_id: "txn123" }),
      "03001234567",
      "payin",
      true,
      true
    );
  });

  it("should throw an error if merchant ID is missing", async () => {
    const result = await swichService.initiateSwichAsync(mockParams, "");

    expect(result).toEqual({
      message: "Merchant ID is required",
      statusCode: 400,
      txnNo: null,
    });
  });

  it("should throw an error if merchant is not found", async () => {
    prisma.merchant.findFirst.mockResolvedValue(null);

    const result = await swichService.initiateSwichAsync(mockParams, "nonexistentMerchant");

    expect(result).toEqual({
      message: "Merchant not found",
      statusCode: 404,
      txnNo: null,
    });
  });

  it("should handle API call failure and update txn status accordingly", async () => {
    prisma.merchant.findFirst.mockResolvedValue(mockMerchant);
    transactionService.createTransactionId.mockReturnValue("txn123");
    transactionService.createTxn.mockResolvedValue({
      transaction_id: "txn123",
      date_time: "2024-12-16T12:00:00Z",
      merchant_transaction_id: "txn123",
    });
    axios.request.mockResolvedValue({
      data: { code: "1000", message: "Transaction failed" },
    });
    swichService.getAuthToken = jest.fn().mockResolvedValue(mockAuthToken);

    const result = await swichService.initiateSwichAsync(mockParams, "merchant123");

    expect(result).toEqual({
      message: "An error occurred while initiating the transaction",
      statusCode: 500,
      txnNo: "txn123",
    });
    expect(transactionService.updateTxn).toHaveBeenCalledWith(
      "txn123",
      { status: "failed", response_message: "Transaction failed" },
      2
    );
  });

  it("should handle error during Swich API call and update txn status", async () => {
    prisma.merchant.findFirst.mockResolvedValue(mockMerchant);
    transactionService.createTransactionId.mockReturnValue("txn123");
    transactionService.createTxn.mockResolvedValue({
      transaction_id: "txn123",
      date_time: "2024-12-16T12:00:00Z",
      merchant_transaction_id: "txn123",
    });
    swichService.getAuthToken = jest.fn().mockResolvedValue(mockAuthToken);

    axios.request.mockRejectedValue(new Error("Swich API request failed"));

    const result = await swichService.initiateSwichAsync(mockParams, "merchant123");

    expect(result).toEqual({
      message: "An error occurred while initiating the transaction",
      statusCode: 500,
      txnNo: "txn123",
    });

    expect(transactionService.updateTxn).toHaveBeenCalledWith(
      "txn123",
      { status: "failed", response_message: "Swich API request failed" },
      2
    );
  });
});
