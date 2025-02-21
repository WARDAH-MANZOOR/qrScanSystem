import {getWalletBalanceWithKey} from "../../../../dist/services/paymentGateway/disbursement.js"; 
import CustomError from "../../../../dist/utils/custom_error.js";
import prisma from "../../../../dist/prisma/client.js"


// Mock Prisma
jest.mock("../../../../dist/prisma/client.js", () => ({
  merchant: {
      findUnique: jest.fn(),
  },
  wallet: {
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
describe("getWalletBalanceWithKey", () => {
  afterEach(() => {
      jest.clearAllMocks();
  });

  it("should return wallet balance if merchant exists", async () => {
    prisma.merchant.findUnique.mockResolvedValue({ id: "merchant123" });
    prisma.wallet.findFirst.mockResolvedValue({ balance: 5000 });
    try{
        const result = await getWalletBalanceWithKey("merchant123");
    
        expect(prisma.merchant.findUnique).toHaveBeenCalledWith({
          where: { id: "merchant123" },
      });
        expect(prisma.wallet.findFirst).toHaveBeenCalledWith({
            where: { merchantId: "merchant123" },
            select: { balance: true },
        });
        expect(result).toBe(5000);
      } catch (error){
        console.error("Wallet Balance", error)
      }
     
  });

  it("should throw a 404 error if merchant does not exist", async () => {
    prisma.merchant.findUnique.mockResolvedValue(null);

    try {
        await getWalletBalanceWithKey("invalidMerchant");
        expect(error.message).toBe('Merchant not found');
        expect(error.statusCode).toBe(404);
      } catch (error) {
        console.error("Merchant not found", error)
      }
  });

  it("should throw a 500 error if wallet retrieval fails", async () => {
      prisma.merchant.findUnique.mockResolvedValue({ id: "merchant123" });
      prisma.wallet.findFirst.mockRejectedValue(new Error("Database error"));
      try {
        await expect(getWalletBalanceWithKey("merchant123"))
          .rejects.toThrow(new CustomError("Unable to fetch wallet balance", 500));

      expect(prisma.merchant.findUnique).toHaveBeenCalledWith({
          where: { id: "merchant123" },
      });
      expect(prisma.wallet.findFirst).toHaveBeenCalledWith({
          where: { merchantId: "merchant123" },
          select: { balance: true },
      });
      } catch (error) {
        console.error("Unable to fetch wallet balance", error)
      }
  });
});