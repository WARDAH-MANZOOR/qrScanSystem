import {getWalletBalanceWithKey} from "../../../../dist/services/paymentGateway/disbursement.js"; 
import CustomError from "../../../../dist/utils/custom_error.js";


// Mocking the functions directly in the test file
const checkMerchantExistsWithKey = async (merchantId) => {
    const user = await prisma.merchant.findMany({
        where: { uid: merchantId },
    });
    return Boolean(user.length == 1);
};

const calculateWalletBalanceWithKey = async (merchantId) => {
    const merchant = await prisma.merchant.findFirst({
        where: { uid: merchantId },
    });
    const result = await prisma.transaction.aggregate({
        _sum: {
            balance: true,
        },
        where: {
            settlement: true,
            balance: { gt: new Decimal(0) },
            merchant_id: merchant?.merchant_id,
        },
    });
    // Find the todays transaction sum
    const servertodayStart = new Date().setHours(0, 0, 0, 0);
    const servertodayEnd = new Date().setHours(23, 59, 59, 999);
    const todayResult = await prisma.transaction.aggregate({
        _sum: {
            balance: true,
        },
        where: {
            settlement: true,
            balance: { gt: new Decimal(0) },
            merchant_id: merchant?.merchant_id,
            date_time: {
                gte: new Date(servertodayStart),
                lt: new Date(servertodayEnd),
            },
        },
    });
    const walletBalance = result._sum.balance || new Decimal(0);
    const todayBalance = todayResult._sum.balance || new Decimal(0);
    return {
        walletBalance: walletBalance.toNumber(),
        todayBalance: todayBalance.toNumber(),
    };
};


// Test cases
describe("getWalletBalanceWithKey", () => {
  it("should return wallet balance if merchant exists", async () => {
    // Call the function with the mocked behavior
    const result = await getWalletBalanceWithKey("merchant123");

    // Validate the result
    expect(result).toEqual({ walletBalance: 100, todayBalance: 50 });

    // Ensure the mock functions were called
    expect(checkMerchantExistsWithKey).toHaveBeenCalledWith("merchant123");
    expect(calculateWalletBalanceWithKey).toHaveBeenCalledWith("merchant123");
  });

  it("should throw 'Merchant not found' error if merchant does not exist", async () => {
    // Ensure the function throws the expected error
    await expect(getWalletBalanceWithKey("nonExistentMerchant"))
      .rejects
      .toThrow(new CustomError("Merchant not found", 404));

    // Ensure the merchant existence check was called
    expect(checkMerchantExistsWithKey).toHaveBeenCalledWith("nonExistentMerchant");
    expect(calculateWalletBalanceWithKey).not.toHaveBeenCalled(); // Should not call balance calculation
  });

  it("should throw 'Unable to fetch wallet balance' error for unexpected errors", async () => {
    // Ensure the function throws the expected error for unexpected issues
    await expect(getWalletBalanceWithKey("invalidMerchant"))
      .rejects
      .toThrow(new CustomError("Unable to fetch wallet balance", 500));

    // Ensure the necessary functions were called
    expect(checkMerchantExistsWithKey).toHaveBeenCalledWith("invalidMerchant");
    expect(calculateWalletBalanceWithKey).toHaveBeenCalledWith("invalidMerchant");
  });
});

