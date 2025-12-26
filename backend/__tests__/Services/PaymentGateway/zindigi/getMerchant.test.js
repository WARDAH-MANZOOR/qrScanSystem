import { CustomError } from '../../../../dist/utils/custom_error.js'; 
import zindigiService from '../../../../dist/services/paymentGateway/zindigi.js'; 
import { decrypt } from "../../../../dist/utils/enc_dec.js";
import prisma from "../../../../dist/prisma/client.js";  

jest.mock("../../../../dist/prisma/client.js", () => ({
  zindigiMerchant: {
    findMany: jest.fn(),  
  },
}));

jest.mock("../../../../dist/utils/enc_dec.js", () => ({
  decrypt: jest.fn(), 
}));

describe('getMerchant', () => {

  it('should retrieve merchant successfully when valid merchantId is provided', async () => {
    const merchantId = '1';
    const mockMerchant = [{
      id: 1,
      clientId: 'encrypted_123',
      clientSecret: 'encrypted_secret',
      organizationId: 'encrypted_org123',
    }];
    
    const decryptedMerchant = [{
      id: 1,
      clientId: '123',
      clientSecret: 'secret',
      organizationId: 'org123',
    }];
    
    decrypt.mockImplementation((val) => {
      if (val === 'encrypted_123') return '123';
      if (val === 'encrypted_secret') return 'secret';
      if (val === 'encrypted_org123') return 'org123';
    });

    prisma.zindigiMerchant.findMany.mockResolvedValue(mockMerchant);

    const result = await zindigiService.getMerchant(merchantId);

    expect(result.message).toBe('Merchant retrieved successfully');
    expect(result.data).toEqual(decryptedMerchant);
    expect(prisma.zindigiMerchant.findMany).toHaveBeenCalledTimes(1); 
    expect(decrypt).toHaveBeenCalledTimes(3); 
  });

  it('should throw an error if merchant not found', async () => {
    prisma.zindigiMerchant.findMany = jest.fn().mockResolvedValue([]);

    try {
      await zindigiService.getMerchant(1);
    } catch (error) {
      expect(error).toBeInstanceOf(CustomError);
      expect(error.message).toBe('Merchant not found');
      expect(error.statusCode).toBe(404);
    }
  });


  it('should throw CustomError if there is a database error', async () => {
    const merchantId = '1';
    prisma.zindigiMerchant.findMany.mockRejectedValue(new Error('Database error'));  

    await expect(zindigiService.getMerchant(merchantId)).rejects.toThrowError(CustomError);
    await expect(zindigiService.getMerchant(merchantId)).rejects.toThrowError('Database error');
  });


});
