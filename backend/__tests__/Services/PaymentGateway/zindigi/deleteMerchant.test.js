import prisma from "../../../../dist/prisma/client.js";
import CustomError from "../../../../dist/utils/custom_error.js";
import zindigiService from "../../../../dist/services/paymentGateway/zindigi.js";

// Mock the prisma client
jest.mock('../../../../dist/prisma/client.js', () => ({
  zindigiMerchant: {
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
}));

// Mock CustomError
jest.mock('../../../../dist/utils/custom_error.js', () => {
  return jest.fn().mockImplementation((message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  });
});

describe('deleteMerchant', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw an error if merchantId is not provided', async () => {
    await expect(zindigiService.deleteMerchant(null))
      .rejects.toThrow("Merchant ID is required");
  });

  it('should delete the merchant successfully and return a success message', async () => {
    prisma.$transaction.mockImplementation(async (callback) => {
      return callback({
        zindigiMerchant: {
          delete: jest.fn().mockResolvedValue({ id: 1 }),
        },
      });
    });

    const result = await zindigiService.deleteMerchant(1);

    expect(result).toEqual({ message: "Merchant deleted successfully" });
  });

  it('should throw an error if the deletion process fails', async () => {
    prisma.$transaction.mockRejectedValue(new Error("Database error"));

    await expect(zindigiService.deleteMerchant(1))
      .rejects.toThrow("Database error");
  });

  it('should throw a custom error if no merchant is deleted', async () => {
    prisma.$transaction.mockImplementation(async (callback) => {
      return callback({
        zindigiMerchant: {
          delete: jest.fn().mockResolvedValue(null), // Simulate no deletion
        },
      });
    });

    await expect(zindigiService.deleteMerchant(1))
      .rejects.toThrow("An error occurred while deleting the merchant");
  });
});
