import {generateUniqueSixDigitNumber} from '../../../../dist/services/paymentGateway/zindigi.js';
describe('generateUniqueSixDigitNumber', () => {
    test('should return a 6-digit string', () => {
      const result = generateUniqueSixDigitNumber();
      expect(result).toHaveLength(6); // Ensure the result has exactly 6 digits
      expect(typeof result).toBe('string'); // Ensure the result is a string
    });
  
    test('should always return a number in the range of 000000 to 999999', () => {
      const result = generateUniqueSixDigitNumber();
      const resultNumber = parseInt(result, 10);
      expect(resultNumber).toBeGreaterThanOrEqual(0); // Ensure the number is >= 0
      expect(resultNumber).toBeLessThan(1000000); // Ensure the number is < 1000000
    });
  
    test('should generate a unique value each time it is called', () => {
      const result1 = generateUniqueSixDigitNumber();
      const result2 = generateUniqueSixDigitNumber();
      expect(result1).not.toBe(result2); // Ensure the results are not the same
    });
  
    test('should handle boundary case of exactly 6 digits', () => {
      const mockTimestamp = 1672531199000; // A fixed timestamp
      jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp); // Mock Date.now to control timestamp
      const result = generateUniqueSixDigitNumber();
      expect(result).toHaveLength(6); // Ensure it's still 6 digits even with the mock
      expect(result).toMatch(/^\d{6}$/); // Ensure the result is numeric and exactly 6 digits
      jest.restoreAllMocks(); // Restore Date.now after the test
    });
  });
  