import prisma from "../../../../dist/prisma/client.js"; 
import CustomError from "../../../../dist/utils/custom_error.js";
import easyPaisaService from "../../../../dist/services/paymentGateway/easypaisa.js";


// Mock Prisma Client
jest.mock("../../../../dist/prisma/client.js", () => ({
  merchant: {
    findFirst: jest.fn(),
  },
  transaction: {
    findFirst: jest.fn(),
  },
}));

describe("getTransaction", () => {
      afterEach(() => {
          jest.clearAllMocks();
      });
  
      it("should return transaction details for a valid merchant and transaction", async () => {
        const mockMerchant = { merchant_id: "12345" };
        const mockTransaction = {
            merchant_transaction_id: "txn123",  // Corrected key name to match the function
            status: "Success",
            original_amount: 500,
            date_time: "2024-01-01T12:00:00Z",
            providerDetails: { msisdn: "03211234567" },
            response_message: "Transaction completed"
        };
    
        prisma.merchant.findFirst.mockResolvedValue(mockMerchant);
        prisma.transaction.findFirst.mockResolvedValue(mockTransaction);
    
        const result = await easyPaisaService.getTransaction("merchantUid", "txn123");
    
        expect(result).toEqual({
            orderId: "txn123",  // Corrected expected value
            transactionStatus: "Success",
            transactionAmount: 500,
            transactionDateTime: "2024-01-01T12:00:00Z",
            msisdn: "03211234567",
            responseDesc: "Transaction completed",
            responseMode: "MA",
            statusCode: 201  // Ensure this is returned correctly
        });
    
        expect(prisma.merchant.findFirst).toHaveBeenCalledWith({
            where: { uid: "merchantUid" },
            select: { merchant_id: true }
        });
    
        expect(prisma.transaction.findFirst).toHaveBeenCalledWith({
            where: {
                merchant_transaction_id: "txn123",  // Corrected key name
                merchant_id: "12345",
                providerDetails: {
                    path: ["name"],
                    equals: "Easypaisa"
                }
            }
        });
    });
    
  it('should throw error when merchant is not found', async () => {
    prisma.merchant.findFirst = jest.fn().mockResolvedValue(null);

    await expect(easyPaisaService.getTransaction('merchant123', 'txn123')).rejects.toThrow(new CustomError('Merchant Not Found', 400));
    expect(prisma.merchant.findFirst).toHaveBeenCalledWith({
      where: { uid: 'merchant123' },
      select: { merchant_id: true },
    });
  });



  it("should throw a CustomError when prisma.merchant.findFirst throws an error", async () => {
    const mockError = new Error("Database connection failed");

    prisma.merchant.findFirst.mockRejectedValue(mockError);

    await expect(easyPaisaService.getTransaction("merchantUid", "txn123")).rejects.toThrow(
        new CustomError("Database connection failed", 500)
    );

    expect(prisma.merchant.findFirst).toHaveBeenCalledWith({
        where: { uid: "merchantUid" },
        select: { merchant_id: true },
    });
});

});

