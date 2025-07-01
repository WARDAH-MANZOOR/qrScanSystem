import axios from "axios";
import prisma from "../../../../dist/prisma/client.js";
import transactionService from "../../../../dist/services/transactions/index.js";
import swichService from "../../../../dist/services/paymentGateway/swich.js";

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
    initiateSwichAsyncClone: jest.fn(),
  }));
describe("initiateSwichAsyncClone", () => {
    const mockPayload = {
      amount: 1000,
      type: "payment",
      phone: "03001234567",
      email: "test@example.com",
      channel: 5649,
      order_id: "ORDER123",
    };
    const mockMerchantId = "MERCHANT123";
    const mockMerchant = {
      merchant_id: "MERCHANT123",
      switchMerchantId: 9876,
      commissions: [
        {
          commissionGST: "5",
          commissionRate: "2",
          easypaisaRate: "1",
          commissionWithHoldingTax: "3",
          commissionMode: "SINGLE",
          settlementDuration: 2,
        },
      ],
      webhook_url: "https://example.com/webhook",
    };
    const mockTxn = {
      transaction_id: "TXN123",
      merchant_transaction_id: "MERCHANT_TXN123",
      date_time: "2024-02-20T12:00:00Z",
    };
  
    beforeEach(() => {
      jest.clearAllMocks();
      prisma.merchant.findFirst.mockResolvedValue(mockMerchant);
      transactionService.createTransactionId.mockReturnValue("TXN123");
      transactionService.createTxn.mockResolvedValue(mockTxn);
      axios.request.mockResolvedValue({ data: { code: "0000", message: "Success" } });
    });
  
    it("should successfully initiate a transaction and update to completed", async () => {
        try {
            await swichService.initiateSwichAsyncClone(mockPayload, mockMerchantId);
            } catch (error) {
                expect(transactionService.createTxn).toHaveBeenCalledWith(
                    expect.objectContaining({
                      order_id: "ORDER123",
                      amount: 1000,
                      status: "pending",
                    })
                  );
                  expect(response).toEqual({
                    txnNo: "MERCHANT_TXN123",
                    txnDateTime: "2024-02-20T12:00:00Z",
                    statusCode: "pending",
                  });
            }
    });
  
    it("should throw an error if merchant ID is missing", async () => {
        try {
                await swichService.initiateSwichAsyncClone(mockPayload, "");
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
            await swichService.initiateSwichAsyncClone(mockPayload, "nonexistentMerchant");
          } catch (error) {
            expect(error).toBeInstanceOf(error);
            expect(error.message).toBe('Merchant not found');
            expect(error.statusCode).toBe(404);
            txnNo: undefined
    
          }
    
      });
  
  
    it("should handle failed transaction when Swich API response is not successful", async () => {
      axios.request.mockResolvedValue({ data: { code: "9999", message: "Transaction Failed" } });
      try {
        await swichService.initiateSwichAsyncClone(mockPayload, mockMerchantId);
      } catch (error) {
        expect(transactionService.updateTxn).toHaveBeenCalledWith(
            "TXN123",
            { status: "failed", response_message: "Transaction Failed" },
            2
          );
          expect(response.statusCode).toBe("pending");

      }
      
    });
  });