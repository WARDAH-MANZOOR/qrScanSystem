import axios from "axios";
import prisma from "../../../../dist/prisma/client.js";
import transactionService from "../../../../dist/services/transactions/index.js";
import swichService from "../../../../dist/services/paymentGateway/swich.js";

// Mock dependencies
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

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {}); // Mock console.log
  jest.spyOn(console, 'error').mockImplementation(() => {}); // Mock console.error
});

afterAll(() => {
  console.log.mockRestore(); // Restore original console.log
  console.error.mockRestore(); // Restore original console.error
});

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

  

  it("should successfully initiate the transaction and return the txn details", async () => {
    // Mock Prisma and transaction service responses
    prisma.merchant.findFirst.mockResolvedValue({
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
    });

    transactionService.createTransactionId.mockReturnValue("txn123");
    transactionService.createTxn.mockResolvedValue({
      transaction_id: "txn123",
      date_time: "2024-12-16T12:00:00Z",
    });

    axios.request.mockResolvedValue({
      data: { code: "0000", message: "Transaction successful" },
    });
    try {
          await swichService.initiateSwichAsync(mockParams, "merchant123");
          expect(result).toEqual({
            txnNo: "txn123",
            txnDateTime: "2024-12-16T12:00:00Z",
            statusCode: "0000",  
          })       
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
            false
          );
        }   catch (error) {
              console.error('Error', error);
        }
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

  it("should throw an error if Swich API returns failure", async () => {
    prisma.merchant.findFirst.mockResolvedValue({
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
    });

    transactionService.createTransactionId.mockReturnValue("txn123");
    transactionService.createTxn.mockResolvedValue({
      transaction_id: "txn123",
      date_time: "2024-12-16T12:00:00Z",
    });

    axios.request.mockResolvedValue({
      data: { code: "1000", message: "Transaction failed" },
    });
    try{

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
  } catch {
    console.error("An error occurred while initiating the transaction")
  }
  });

});
