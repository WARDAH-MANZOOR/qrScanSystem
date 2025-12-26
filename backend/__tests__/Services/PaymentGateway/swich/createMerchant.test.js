import prisma from "../../../../dist/prisma/client.js";
import CustomError from "../../../../dist/utils/custom_error.js";
import swichService from "../../../../dist/services/paymentGateway/swich.js";
import { encrypt } from "../../../../dist/utils/enc_dec.js";

jest.mock("axios");
jest.mock("../../../../dist/prisma/client.js", () => ({
    swichMerchant: {
        findUnique: jest.fn(), // Mock the findUnique method
    },
}));
jest.mock("../../../../dist/utils/enc_dec.js");

describe('createMerchant', () => {
    beforeEach(() => {
        jest.clearAllMocks(); // Clear mocks before each test case
    });

    it('should throw an error if merchant data is not provided', async () => {
        // Arrange
        const merchantData = null;
    
        // Act & Assert
        await expect(swichService.createMerchant(merchantData)).rejects.toThrowError(
          new CustomError('Merchant data is required', 400)
        );
      });

    it('should create merchant and return success message', async () => {
        const mockMerchantData = { clientId: 'testClientId', clientSecret: 'testClientSecret' };

        encrypt.mockImplementation((data) => data); // Mocking encrypt function to return data as is
        prisma.$transaction = jest.fn().mockResolvedValue({
            clientId: mockMerchantData.clientId,
            clientSecret: mockMerchantData.clientSecret
        });

        const result = await swichService.createMerchant(mockMerchantData);

        expect(result.message).toBe('Merchant created successfully');
        expect(result.data.clientId).toBe(mockMerchantData.clientId);
        expect(result.data.clientSecret).toBe(mockMerchantData.clientSecret);
        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should throw error if merchant creation fails', async () => {
        const mockMerchantData = { clientId: 'testClientId', clientSecret: 'testClientSecret' };

        encrypt.mockImplementation((data) => data);
        prisma.$transaction = jest.fn().mockResolvedValue(null); // Simulating failure of merchant creation

        try {
            await swichService.createMerchant(mockMerchantData);
        } catch (error) {
            expect(error).toBeInstanceOf(CustomError);
            expect(error.message).toBe('An error occurred while creating the merchant');
            expect(error.statusCode).toBe(500);
        }
    });

    it('should throw error if any other error occurs', async () => {
        const mockMerchantData = { clientId: 'testClientId', clientSecret: 'testClientSecret' };

        encrypt.mockImplementation((data) => data);
        prisma.$transaction = jest.fn().mockRejectedValue(new Error('Database error')); // Simulating unexpected error

        try {
            await swichService.createMerchant(mockMerchantData);
        } catch (error) {
            expect(error).toBeInstanceOf(CustomError);
            expect(error.message).toBe('Database error');
            expect(error.statusCode).toBe(500);
        }
    });
});
