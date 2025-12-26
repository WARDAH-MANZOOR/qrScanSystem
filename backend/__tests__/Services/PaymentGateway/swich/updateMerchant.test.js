import prisma from "../../../../dist/prisma/client.js";
import CustomError from "../../../../dist/utils/custom_error.js";
import { encrypt } from "../../../../dist/utils/enc_dec.js";
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

// Mocking encrypt function
jest.mock("../../../../dist/utils/enc_dec.js");

describe("updateMerchant", () => {
    beforeAll(() => {
        jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.log
        jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
      });
      
      afterAll(() => {
        jest.restoreAllMocks(); // Restore console methods after tests
      });
      
  
    it('should throw an error if merchantId is not provided', async () => {
      // Arrange
      const merchantId = null;
  
      // Act & Assert
      await expect(swichService.updateMerchant(merchantId, { clientId: "newClientId" })).rejects.toThrowError(
        new CustomError('Merchant ID is required', 400)
      );
    });
  
    it('should throw an error if updateData is not provided', async () => {
      // Arrange
      const updateData = null;
  
      // Act & Assert
      await expect(swichService.updateMerchant(1, updateData)).rejects.toThrowError(
        new CustomError('Update data is required', 400)
      );
    });
  
  it("should throw an error if merchant is not found", async () => {
    prisma.swichMerchant.findUnique.mockResolvedValue(null);

    try {
      await swichService.updateMerchant(1, { clientId: "newClientId" });
    } catch (error) {
      expect(error).toBeInstanceOf(CustomError);
      expect(error.message).toBe("Merchant not found");
      expect(error.statusCode).toBe(500);
    }
  });

  it("should update merchant successfully", async () => {
    const mockExistingMerchant = {
      id: 1,
      clientId: "existingEncryptedClientId",
      clientSecret: "existingEncryptedClientSecret",
    };

    prisma.swichMerchant.findUnique.mockResolvedValue(mockExistingMerchant);
    encrypt.mockImplementation((data) => `encrypted_${data}`);

    const mockUpdatedMerchant = {
      id: 1,
      clientId: "encrypted_newClientId",
      clientSecret: "encrypted_existingEncryptedClientSecret",
    };

    prisma.swichMerchant.update.mockResolvedValue(mockUpdatedMerchant);

    const result = await swichService.updateMerchant(1, { clientId: "newClientId" });

    expect(result.message).toBe("Merchant updated successfully");
    expect(result.data).toEqual(mockUpdatedMerchant);
    expect(prisma.swichMerchant.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
    });
    expect(prisma.swichMerchant.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        clientId: "encrypted_newClientId",
        clientSecret: "existingEncryptedClientSecret",
      },
    });
  });

  it("should handle errors during merchant update", async () => {
    prisma.swichMerchant.findUnique.mockResolvedValue({
      id: 1,
      clientId: "existingEncryptedClientId",
      clientSecret: "existingEncryptedClientSecret",
    });

    prisma.swichMerchant.update.mockRejectedValue(new Error("Database error"));

    try {
      await swichService.updateMerchant(1, { clientId: "newClientId" });
    } catch (error) {
      expect(error).toBeInstanceOf(CustomError);
      expect(error.message).toBe("Database error");
      expect(error.statusCode).toBe(500);
    }
  });
});
