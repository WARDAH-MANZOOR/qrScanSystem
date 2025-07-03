import axios from "axios";
import prisma from "../../../../dist/prisma/client.js";
import transactionService from "../../../../dist/services/transactions/index.js";
import swichService from "../../../../dist/services/paymentGateway/swich.js";
import { CustomError } from '../../../../dist/utils/custom_error.js'

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
jest.mock("../../../../dist/services/paymentGateway/swich.js", () => ({
    initiateSwichClone: jest.fn(),
  }));
  
describe("initiateSwichClone", () => {

    let payload, merchant, transaction;

  beforeEach(() => {
    payload = {
      order_id: "order123",
      channel: 5624,
      amount: 1000,
      phone: "1234567890",
      email: "test@example.com",
      type: "payment",
    };

    merchant = {
      uid: "merchant123",
      swichMerchantId: 9999,
      webhook_url: "https://merchant.com/webhook",
      commissions: [
        {
          commissionMode: "SINGLE",
          commissionGST: 5,
          commissionRate: 10,
          commissionWithHoldingTax: 2,
          settlementDuration: 7,
        },
      ],
    };

    transaction = {
      transaction_id: "txn123",
      merchant_transaction_id: "merchant_txn123",
      date_time: new Date().toISOString(),
    };

    prisma.merchant.findFirst.mockResolvedValue(merchant);
    transactionService.createTxn.mockResolvedValue(transaction);
  });

  it("should throw an error if merchant ID is missing", async () => {
    try {
            await swichService.initiateSwichClone(payload, "");
          } catch (error) {
            expect(error).toBeInstanceOf(error);
            expect(error.message).toBe('Merchant ID is required');
            expect(error.statusCode).toBe(400);
            txnNo: undefined

          }

  });

  it("should throw an error if merchant is not found", async () => {
    prisma.merchant.findFirst.mockResolvedValue(null);

    try {
        await swichService.initiateSwichClone(payload, "nonexistentMerchant");
      } catch (error) {
        expect(error).toBeInstanceOf(error);
        expect(error.message).toBe('Merchant not found');
        expect(error.statusCode).toBe(404);
        txnNo: undefined

      }

  });

  it("should create a transaction and complete it on success", async () => {
    axios.request.mockResolvedValue({ data: { code: "0000", message: "Success" } });
    try {
        await swichService.initiateSwichClone(payload, "merchant123");
      } catch (error) {
        expect(transactionService.createTxn).toHaveBeenCalledWith(
            expect.objectContaining({ order_id: "order123", status: "pending" })
          );
          expect(transactionService.updateTxn).toHaveBeenCalledWith(
            "txn123",
            expect.objectContaining({ status: "completed" }),
            7
          );
          expect(transactionService.sendCallback).toHaveBeenCalled();
          expect(result).toEqual({
            txnNo: "merchant_txn123",
            txnDateTime: transaction.date_time,
            statusCode: "0000",
          });
      }
  });

  it("should create a transaction and mark it as failed on failure response", async () => {
    axios.request.mockResolvedValue({ data: { code: "9999", message: "Transaction Failed" } });
    try {
        await swichService.initiateSwichClone(payload, "merchant123")
      } catch (error) {
        expect(error).toBeInstanceOf(error);
        expect(error.message).toBe('An error occurred while initiating the transaction');
        expect(transactionService.updateTxn).toHaveBeenCalledWith(
            "txn123",
            expect.objectContaining({ status: "failed" }),
            7
          );

      }
 
  });

  it("should handle exceptions and return failure response", async () => {
    axios.request.mockRejectedValue(new Error("Network Error"));
    try {
        await  await swichService.initiateSwichClone(payload, "merchant123");
      } catch (error) {
        expect(transactionService.updateTxn).toHaveBeenCalledWith(
            "txn123",
            expect.objectContaining({ status: "failed" }),
            7
          );
          expect(result).toEqual({
            message: "Network Error",
            statusCode: 500,
            txnNo: "merchant_txn123",
          });
      }
 
  });
});
