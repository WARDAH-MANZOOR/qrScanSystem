import prisma from "../../../../dist/prisma/client.js";
import CustomError from "../../../../dist/utils/custom_error.js";
import swichService from "../../../../dist/services/paymentGateway/swich.js";
import { decrypt } from "../../../../dist/utils/enc_dec.js";

jest.mock("../../../../dist/prisma/client.js", () => ({
  swichMerchant: {
    findMany: jest.fn(),
  },
}));
jest.mock("../../../../dist/utils/enc_dec.js");

describe('getMerchant', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Clear mocks before each test case
  });

  it('should retrieve merchant successfully', async () => {
    const mockMerchantData = [
      { id: 1, clientId: 'encryptedClientId', clientSecret: 'encryptedClientSecret' },
    ];

    // Mock the decrypt function to return decrypted values
    decrypt.mockImplementation((data) => {
      if (data === 'encryptedClientId') return 'decryptedClientId';
      if (data === 'encryptedClientSecret') return 'decryptedClientSecret';
      return data;
    });

    prisma.swichMerchant.findMany = jest.fn().mockResolvedValue(mockMerchantData);

    const result = await swichService.getMerchant(1);

    expect(result.message).toBe('Merchant retrieved successfully');
    expect(result.data).toEqual(mockMerchantData.map((obj) => ({
      ...obj,
      clientId: 'decryptedClientId',  // Use decrypted values in expected result
      clientSecret: 'decryptedClientSecret', // Use decrypted values in expected result
    })));
    expect(prisma.swichMerchant.findMany).toHaveBeenCalledWith({
      where: { id: 1 },
      orderBy: { id: 'desc' },
    });
  });


  it('should throw an error if merchant not found', async () => {
    prisma.swichMerchant.findMany = jest.fn().mockResolvedValue([]);

    try {
      await swichService.getMerchant(1);
    } catch (error) {
      expect(error).toBeInstanceOf(CustomError);
      expect(error.message).toBe('Merchant not found');
      expect(error.statusCode).toBe(404);
    }
  });

  it('should throw an error if an unexpected error occurs', async () => {
    prisma.swichMerchant.findMany = jest.fn().mockRejectedValue(new Error('Database error'));

    try {
      await swichService.getMerchant(1);
    } catch (error) {
      expect(error).toBeInstanceOf(CustomError);
      expect(error.message).toBe('Database error');
      expect(error.statusCode).toBe(500);
    }
  });
});
