import prisma from '../../../../dist/prisma/client.js';
import CustomError from '../../../../dist/utils/custom_error.js';
import crypto from 'crypto';
import serviceAuthentication from "../../../../dist/services/authentication/index.js"; // Import the function
jest.mock('../../../../dist/prisma/client.js', () => ({
    $transaction: jest.fn(),
    user: {
        update: jest.fn(),
    },
}));

jest.mock('../../../../dist/utils/custom_error.js', () => {
    return jest.fn().mockImplementation((message, statusCode) => {
        const error = new Error(message);
        error.statusCode = statusCode;
        return error;
    });
});

jest.mock('crypto', () => ({
    randomBytes: jest.fn(() => Buffer.alloc(32, 'a')), // Creates a 32-byte buffer
  }));
  
describe('createDecryptionKey function', () => {
    const mockUserId = 1;
    const mockDecryptionKey = 'dysfbjkeghe357dfjn'; // Example decryption key

    beforeEach(() => {
        jest.clearAllMocks(); // Ensure mocks are reset before each test
        jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error

    });

    it('should create and return a decryption key successfully', async () => {
        const userId = 1;
        const mockDecryptionKey = crypto.randomBytes(32).toString('hex');
    
        // Mock transaction update behavior
        prisma.$transaction.mockImplementation(async (callback) => {
          return await callback({
            user: {
              update: jest.fn().mockResolvedValue({ id: userId, decryptionKey: mockDecryptionKey }),
            },
          });
        });
    
        const result = await serviceAuthentication.createDecryptionKey(userId);
    
        expect(result).toEqual({
          key: expect.any(String),
          message: 'API key created successfully',
        });
        expect(result.key.length).toBe(64); // Hexadecimal length for 32 bytes
      });





    it('should throw error if user update fails', async () => {
        const mockBuffer = Buffer.from(mockDecryptionKey, 'hex');
        crypto.randomBytes = jest.fn().mockReturnValue(mockBuffer);

        prisma.$transaction.mockRejectedValue(new Error('Database update failed'));
        
        try {
            await serviceAuthentication.createDecryptionKey(mockUserId);
        } catch (e) {
            expect(e.message).toBe('An error occured while creating the API key');
            expect(e.statusCode).toBe(500); 
        }
    });

    it('should log error when transaction fails', async () => {
        const mockBuffer = Buffer.from(mockDecryptionKey, 'hex');
        crypto.randomBytes = jest.fn().mockReturnValue(mockBuffer);

        prisma.$transaction.mockRejectedValue(new Error('Transaction failed'));
        
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        
        await serviceAuthentication.createDecryptionKey(mockUserId);
        
        expect(consoleSpy).toHaveBeenCalledWith('Transaction rolled back due to error:', expect.any(Error));
        consoleSpy.mockRestore();
    });

    it('should handle error thrown in catch block', async () => {
        const mockBuffer = Buffer.from(mockDecryptionKey, 'hex');
        crypto.randomBytes = jest.fn().mockReturnValue(mockBuffer);

        prisma.$transaction.mockRejectedValue(new Error('Something went wrong'));

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        try {
            await serviceAuthentication.createDecryptionKey(mockUserId);
        } catch (e) {
            expect(e.message).toBe('Transaction rolled back due to error:');
            expect(e.statusCode).toBe(500);
        }
        
        consoleSpy.mockRestore();
    });
});
