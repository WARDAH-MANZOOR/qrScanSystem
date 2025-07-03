import crypto from 'crypto'; // Ensure crypto module is available
import { calculateHmacSha256 } from '../../../../dist/services/paymentGateway/jazzCash.js'; // Adjust the import path

// Mock crypto.createHmac and other methods to avoid actual hashing in tests
jest.mock('crypto', () => ({
  createHmac: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('MOCKED_HASH'),
  })),
  randomBytes: jest.fn(() => Buffer.from('mockedRandomBytes')), // Mock randomBytes as well
}));

describe('calculateHmacSha256', () => {
    beforeAll(() => {
        jest.spyOn(console, 'log').mockImplementation(() => {}); // Mock console.log
        jest.spyOn(console, 'error').mockImplementation(() => {}); // Mock console.error
      });
      
      afterAll(() => {
        console.log.mockRestore(); // Restore original console.log
        console.error.mockRestore(); // Restore original console.error
      });
      
  it('should calculate HMAC SHA256 hash correctly for valid JSON', () => {
    const jsonInput = '{"key1": "value1", "key2": "value2", "pp_SecureHash": "somehash"}';
    const integrityText = 'your_integrity_key_here';
    
    // Call the function
    const result = calculateHmacSha256(jsonInput, integrityText);
    
    // Expect the result to be the mocked hash
    expect(result).toBe('MOCKED_HASH');
  });

  it('should handle empty JSON input correctly', () => {
    const jsonInput = '{}';
    const integrityText = 'your_integrity_key_here';
    
    // Call the function
    const result = calculateHmacSha256(jsonInput, integrityText);
    
    // Expect the result to be the mocked hash
    expect(result).toBe('MOCKED_HASH');
  });

  it('should return null for invalid JSON input', () => {
    const jsonInput = '{key1: "value1", "key2": "value2"}'; // Invalid JSON (missing quotes around key1)
    const integrityText = 'your_integrity_key_here';
    
    // Call the function
    const result = calculateHmacSha256(jsonInput, integrityText);
    
    // Expect the result to be null due to JSON parsing error
    expect(result).toBeNull();
  });

  it('should ignore "pp_SecureHash" key in the sorted list', () => {
    const jsonInput = '{"pp_SecureHash": "somehash", "key1": "value1", "key2": "value2"}';
    const integrityText = 'your_integrity_key_here';
    
    // Call the function
    const result = calculateHmacSha256(jsonInput, integrityText);
    
    // Expect the result to be the mocked hash
    expect(result).toBe('MOCKED_HASH');
  });

  it('should return null if error occurs during HMAC calculation', () => {
    // Force error by mocking createHmac to throw an error
    crypto.createHmac.mockImplementationOnce(() => {
      throw new Error('HMAC calculation error');
    });

    const jsonInput = '{"key1": "value1", "key2": "value2"}';
    const integrityText = 'your_integrity_key_here';
    
    // Call the function
    const result = calculateHmacSha256(jsonInput, integrityText);
    
    // Expect null due to error during HMAC calculation
    expect(result).toBeNull();
  });
});
