import { CustomError } from '../../../../dist/utils/custom_error.js';
import zindigiService from '../../../../dist/services/paymentGateway/zindigi.js';
import { encrypt } from "../../../../dist/utils/enc_dec.js";
import prisma from "../../../../dist/prisma/client.js";  // Ensure the mock is in place

jest.mock("../../../../dist/prisma/client.js", () => ({
  $transaction: jest.fn(),  // Mock $transaction explicitly
}));

jest.mock("../../../../dist/utils/enc_dec.js", () => ({
  encrypt: jest.fn(), // Mock encrypt function
}));

describe('createMerchant', () => {

  it('should create a merchant successfully when valid data is provided', async () => {
    // Arrange
    const merchantData = {
      clientId: '123',
      clientSecret: 'secret',
      organizationId: 'org123',
    };
    const mockMerchant = {
      id: '1',
      clientId: '123',
      clientSecret: 'secret',
      organizationId: 'org123',
    };
    prisma.$transaction.mockResolvedValue({ zindigiMerchant: { ...mockMerchant } }); // Mock successful DB transaction
    encrypt.mockImplementation((val) => `encrypted_${val}`); // Mock encrypt function to simulate encryption behavior

    // Act
    const result = await zindigiService.createMerchant(merchantData);

    // Assert
    expect(result.message).toBe('Merchant created successfully');
    expect(result.data).toEqual({ zindigiMerchant: mockMerchant });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1); // Ensure the transaction was called
  });

  it('should throw CustomError when no merchantData is provided', async () => {
    // Act & Assert
    await expect(zindigiService.createMerchant()).rejects.toThrowError(CustomError);
    await expect(zindigiService.createMerchant()).rejects.toThrowError('Merchant data is required');
  });

  it('should throw CustomError if the Prisma transaction fails', async () => {
    // Arrange
    const merchantData = {
      clientId: '123',
      clientSecret: 'secret',
      organizationId: 'org123',
    };
    prisma.$transaction.mockRejectedValue(new Error('Database error'));  // Mock Prisma transaction failure

    // Act & Assert
    await expect(zindigiService.createMerchant(merchantData)).rejects.toThrowError(CustomError);
    await expect(zindigiService.createMerchant(merchantData)).rejects.toThrowError('Database error');
  });

  it('should throw CustomError if the Prisma transaction returns null or undefined', async () => {
    // Arrange
    const merchantData = {
      clientId: '123',
      clientSecret: 'secret',
      organizationId: 'org123',
    };
    prisma.$transaction.mockResolvedValue(null);  // Mock the transaction returning null

    // Act & Assert
    await expect(zindigiService.createMerchant(merchantData)).rejects.toThrowError(CustomError);
    await expect(zindigiService.createMerchant(merchantData)).rejects.toThrowError('An error occurred while creating the merchant');
  });

  it('should call encrypt with clientId, clientSecret, and organizationId', async () => {
    // Arrange
    const merchantData = {
      clientId: '123',
      clientSecret: 'secret',
      organizationId: 'org123',
    };

    // Mocking encrypt calls
    encrypt.mockImplementation((val) => `encrypted_${val}`);
    
    // Mock DB transaction to resolve with the merchant data
    prisma.$transaction.mockImplementation(async (callback) => {
      const result = await callback({
        zindigiMerchant: {
          create: jest.fn().mockResolvedValue({
            id: '1',
            clientId: 'encrypted_123',
            clientSecret: 'encrypted_secret',
            organizationId: 'encrypted_org123'
          })
        }
      });
      return result;
    });

    // Act
    await zindigiService.createMerchant(merchantData);

    // Assert
    expect(encrypt).toHaveBeenCalledTimes(3); // Ensure it's called 3 times
    expect(encrypt).toHaveBeenCalledWith('123');
    expect(encrypt).toHaveBeenCalledWith('secret');
    expect(encrypt).toHaveBeenCalledWith('org123');
  });
});
