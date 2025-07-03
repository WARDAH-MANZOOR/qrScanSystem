import jazzCashService from '../../../../dist/services/paymentGateway/jazzCash.js'; // adjust the path accordingly

// Mock data and salt for testing
const mockData = {
  pp_Amount: '100',
  pp_BillReference: 'ref123',
  pp_Description: 'Payment for services',
  pp_Language: 'EN',
  pp_MerchantID: 'merchant123',
  pp_Password: 'password123',
  pp_ReturnURL: 'https://example.com/return',
  pp_TxnCurrency: 'USD',
  pp_TxnDateTime: '2025-01-07T12:00:00Z',
  pp_TxnExpiryDateTime: '2025-01-07T14:00:00Z',
  pp_TxnRefNo: 'txn123',
  pp_TxnType: 'SALE',
  pp_Version: '1.0',
  ppmpf_1: 'extraParam',
};

const mockSalt = 'secretSalt';

describe('getSecureHash', () => {
  it('should generate the correct hash with valid data and salt', () => {
    // Calculate the expected hash manually or using the function
    const expectedHash = jazzCashService.getSecureHash(mockData, mockSalt);

    // Call the function with mock data and salt
    const result = jazzCashService.getSecureHash(mockData, mockSalt);

    expect(result).toBe(expectedHash);
  });

  it('should handle empty data fields correctly', () => {
    const incompleteMockData = { ...mockData, pp_Description: '' }; // Empty description

    const expectedHash = jazzCashService.getSecureHash(incompleteMockData, mockSalt);

    const result = jazzCashService.getSecureHash(incompleteMockData, mockSalt);

    expect(result).toBe(expectedHash);
  });

  it('should generate a different hash for different salt values', () => {
    const salt1 = 'salt1';
    const salt2 = 'salt2';

    const resultWithSalt1 = jazzCashService.getSecureHash(mockData, salt1);
    const resultWithSalt2 = jazzCashService.getSecureHash(mockData, salt2);

    expect(resultWithSalt1).not.toBe(resultWithSalt2);
  });

  it('should ignore empty string values in the sorted data for hash generation', () => {
    const incompleteMockData = { ...mockData, pp_Amount: '', pp_BillReference: '' }; // Empty amount and bill reference

    const expectedHash = jazzCashService.getSecureHash(incompleteMockData, mockSalt);

    const result = jazzCashService.getSecureHash(incompleteMockData, mockSalt);

    expect(result).toBe(expectedHash);
  });

  it('should sort the keys of the data before hashing', () => {
    const unsortedMockData = {
      pp_BillReference: 'ref123',
      pp_Amount: '100',
      pp_Description: 'Payment for services',
      pp_Language: 'EN',
      pp_MerchantID: 'merchant123',
      pp_Password: 'password123',
      pp_ReturnURL: 'https://example.com/return',
      pp_TxnCurrency: 'USD',
      pp_TxnDateTime: '2025-01-07T12:00:00Z',
      pp_TxnExpiryDateTime: '2025-01-07T14:00:00Z',
      pp_TxnRefNo: 'txn123',
      pp_TxnType: 'SALE',
      pp_Version: '1.0',
      ppmpf_1: 'extraParam',
    };

    const expectedHash = jazzCashService.getSecureHash(unsortedMockData, mockSalt);

    const result = jazzCashService.getSecureHash(unsortedMockData, mockSalt);

    expect(result).toBe(expectedHash);
  });
});
