import transactionsService from "../../../../dist/services/transactions/index.js";

describe('convertPhoneNumber', () => {

    it('should convert a phone number starting with +92 to a local format', () => {
      const result = transactionsService.convertPhoneNumber('+923001234567');
      expect(result).toBe('03001234567');
    });
  
    it('should convert a phone number starting with 92 to a local format', () => {
      const result = transactionsService.convertPhoneNumber('9203001234567');
      expect(result).toBe('003001234567');
    });
  
    it('should return the phone number unchanged if it does not start with +92 or 92', () => {
      const result = transactionsService.convertPhoneNumber('03001234567');
      expect(result).toBe('03001234567');
    });
  
    it('should return the phone number unchanged if it starts with +93', () => {
      const result = transactionsService.convertPhoneNumber('+930301234567');
      expect(result).toBe('+930301234567');
    });
  
    it('should return the phone number unchanged if it starts with 93', () => {
      const result = transactionsService.convertPhoneNumber('930301234567');
      expect(result).toBe('930301234567');
    });
  
    it('should handle an empty phone number', () => {
      const result = transactionsService.convertPhoneNumber('');
      expect(result).toBe('');
    });
  

  });
  