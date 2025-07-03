import zindigiService from "../../../../dist/services/paymentGateway/zindigi.js";
import prisma from "../../../../dist/prisma/client.js";
import CustomError from "../../../../dist/utils/custom_error.js";

// Mock the prisma client
jest.mock('../../../../dist/prisma/client.js', () => ({
  zindigiMerchant: {
    findUnique: jest.fn(),
    update: jest.fn(),
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

describe('updateMerchant', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.log
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
  });
  
  afterAll(() => {
    jest.restoreAllMocks(); // Restore console methods after tests
  });
  

  it('should throw an error if merchantId is not provided', async () => {
    await expect(zindigiService.updateMerchant(null, { clientId: 'clientId123' }))
      .rejects.toThrow("Merchant ID is required");
  });

  it('should throw an error if updateData is not provided', async () => {
    await expect(zindigiService.updateMerchant(1, null))
      .rejects.toThrow("Update data is required");
  });

  it('should throw an error if merchant is not found', async () => {
    prisma.zindigiMerchant.findUnique.mockResolvedValue(null);

    await expect(zindigiService.updateMerchant(1, { clientId: 'clientId123' }))
      .rejects.toThrow("Merchant not found");
  });

  it('should update the merchant successfully and return the updated data', async () => {
    const existingMerchant = {
      id: 1,
      clientId: 'oldClientId',
      clientSecret: 'oldClientSecret',
      organizationId: 'oldOrgId',
    };

    const updatedMerchant = {
      id: 1,
      clientId: 'encryptedClientId',
      clientSecret: 'encryptedClientSecret',
      organizationId: 'encryptedOrgId',
    };

    prisma.zindigiMerchant.findUnique.mockResolvedValue(existingMerchant);
    prisma.$transaction.mockImplementation(async (callback) => {
      return callback({
        zindigiMerchant: {
          update: jest.fn().mockResolvedValue(updatedMerchant),
        },
      });
    });

    const result = await zindigiService.updateMerchant(1, {
      clientId: 'newClientId',
      clientSecret: 'newClientSecret',
    });

    expect(result).toEqual({
      message: "Merchant updated successfully",
      data: updatedMerchant,
    });
  });

  it('should throw an error if an error occurs during the update process', async () => {
    const existingMerchant = {
        id: 1,
        clientId: 'oldClientId',
        clientSecret: 'oldClientSecret',
        organizationId: 'oldOrgId',
    };

    prisma.zindigiMerchant.findUnique.mockResolvedValue(existingMerchant);

    // Mock the $transaction to throw a database error
    prisma.$transaction.mockRejectedValue(new Error("Database error"));

    // Expect the rethrown error message
    await expect(zindigiService.updateMerchant(1, {
        clientId: 'newClientId',
        clientSecret: 'newClientSecret',
    })).rejects.toThrow("Database error");
});



});
