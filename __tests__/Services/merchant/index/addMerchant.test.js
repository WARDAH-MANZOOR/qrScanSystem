import prisma from '../../../../dist/prisma/client.js';
import CustomError from '../../../../dist/utils/custom_error.js';
import { hashPassword } from '../../../../dist/services/authentication/index.js';
import merchantService from '../../../../dist/services/merchant/index.js'; // Path to your actual service file

jest.mock("../../../../dist/prisma/client.js", () => ({
    $transaction: jest.fn(),
}));

jest.mock("../../../../dist/utils/custom_error.js", () => {
    return jest.fn().mockImplementation((message, statusCode) => {
        const error = new Error(message);
        error.statusCode = statusCode;
        return error;
    });
});
jest.mock('../../../../dist/services/authentication/index.js');

describe('addMerchant function', () => {
  
  const mockPayload = {
    username: 'merchant1',
    email: 'merchant1@example.com',
    password: 'password123',
    phone_number: '123456789',
    company_name: 'Example Corp',
    company_url: 'https://example.com',
    city: 'New York',
    payment_volume: 10000,
    commission: 10,
    commissionGST: 5,
    commissionWithHoldingTax: 2,
    disbursementGST: 3,
    disbursementRate: 5,
    disbursementWithHoldingTax: 2,
    settlementDuration: 30,
    jazzCashMerchantId: 'JCM123',
    easyPaisaMerchantId: 'EPM123',
    swichMerchantId: 'SM123',
    webhook_url: 'https://example.com/webhook',
    easypaisaPaymentMethod: 'Bank',
    easypaisaInquiryMethod: 'SMS',
    JazzCashDisburseAccountId: 'JDA123',
    encrypted: true,
    callback_mode: 'MULTIPLE',
    payout_callback: 'https://example.com/payout'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
    jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.error
  });

  it('should create a merchant successfully', async () => {
    hashPassword.mockResolvedValue('hashedPassword');
    prisma.$transaction.mockResolvedValue('Merchant created successfully');
    
    const result = await merchantService.addMerchant(mockPayload);
    
    expect(result).toBe('Merchant created successfully');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(hashPassword).toHaveBeenCalledWith(mockPayload.password);
  });

  it('should create a merchant with SINGLE callback mode and null payout_callback', async () => {
    const payloadWithSingleCallbackMode = { ...mockPayload, callback_mode: 'SINGLE', payout_callback: 'https://example.com/payout' };
    hashPassword.mockResolvedValue('hashedPassword');
    prisma.$transaction.mockResolvedValue('Merchant created successfully');
    
    const result = await merchantService.addMerchant(payloadWithSingleCallbackMode);
    
    expect(result).toBe('Merchant created successfully');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(hashPassword).toHaveBeenCalledWith(payloadWithSingleCallbackMode.password);
  });


  it('should use default value for settlementDuration if undefined', async () => {
    const payloadWithUndefinedSettlementDuration = { ...mockPayload, settlementDuration: undefined };
    hashPassword.mockResolvedValue('hashedPassword');
    prisma.$transaction.mockResolvedValue('Merchant created successfully');
    
    const result = await merchantService.addMerchant(payloadWithUndefinedSettlementDuration);

    expect(result).toBe('Merchant created successfully');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(hashPassword).toHaveBeenCalledWith(payloadWithUndefinedSettlementDuration.password);
  });

  it('should throw an error if password hashing fails', async () => {
    hashPassword.mockRejectedValue(new Error('Password hashing failed'));
    
    try {
      await merchantService.addMerchant(mockPayload);
    } catch (e) {
      expect(e.message).toBe('Password hashing failed');
      expect(e.statusCode).toBe(500);
    }
  });



});
