import prisma from "../../../../dist/prisma/client.js";
import CustomError from "../../../../dist/utils/custom_error.js";
import swichService from "../../../../dist/services/paymentGateway/swich.js";

// Mocking Prisma client
jest.mock("../../../../dist/prisma/client.js", () => {
  const mockPrisma = {
    swichMerchant: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };
  return mockPrisma;
});



describe('deleteMerchant', () => {
    beforeEach(() => {
      jest.clearAllMocks(); // Clear mocks before each test
    });
  
    test('should throw an error if merchantId is not provided', async () => {
      await expect(swichService.deleteMerchant()).rejects.toThrowError(new CustomError('Merchant ID is required', 400));
    });
  
    test('should delete the merchant and return a success message when merchantId is valid', async () => {
      const mockDeletedMerchant = { id: 1, name: 'Test Merchant' }; // Mocked merchant data
      prisma.$transaction.mockImplementation(async (callback) => callback({
        swichMerchant: {
          delete: jest.fn().mockResolvedValue(mockDeletedMerchant),
        },
      }));
  
      const result = await swichService.deleteMerchant(1);
  
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Merchant deleted successfully' });
    });
  
    test('should throw an error if merchant deletion fails', async () => {
      prisma.$transaction.mockImplementation(async (callback) => callback({
        swichMerchant: {
          delete: jest.fn().mockResolvedValue(null),
        },
      }));
  
      await expect(swichService.deleteMerchant(1)).rejects.toThrowError(
        new CustomError('An error occurred while deleting the merchant', 500)
      );
    });
  
    test('should handle errors thrown inside the try block', async () => {
      prisma.$transaction.mockRejectedValue(new Error('Database error'));
  
      await expect(swichService.deleteMerchant(1)).rejects.toThrowError(
        new CustomError('Database error', 500)
      );
    });
  });