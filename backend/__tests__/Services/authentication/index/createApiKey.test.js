import prisma from '../../../../dist/prisma/client.js';
import { generateApiKey, hashApiKey } from '../../../../dist/utils/authentication.js';
import CustomError from '../../../../dist/utils/custom_error.js';
import  serviceAuthentication  from "../../../../dist/services/authentication/index.js"; // Import the function

jest.mock('../../../../dist/utils/authentication.js', () => ({
    generateApiKey: jest.fn(),
    hashApiKey: jest.fn(),
}));

jest.mock('../../../../dist/prisma/client.js', () => ({
    $transaction: jest.fn(),
}));

jest.mock('../../../../dist/utils/custom_error.js', () => {
    return jest.fn().mockImplementation((message, statusCode) => {
        const error = new Error(message);
        error.statusCode = statusCode;
        return error;
    });
});

describe('createAPIKey function', () => {
    const mockUserId = 1;
    const mockApiKey = 'generated-api-key';

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error

    });

    it('should create API key successfully', async () => {
        // Mocking generateApiKey and hashApiKey
        generateApiKey.mockReturnValue(mockApiKey);
        hashApiKey.mockReturnValue('hashed-api-key');
        
        // Mocking prisma.$transaction to resolve successfully
        prisma.$transaction.mockResolvedValue('User updated successfully');
        
        const result = await serviceAuthentication.createAPIKey(mockUserId);
        
        expect(result.key).toBe(mockApiKey);
        expect(result.message).toBe('API key created successfully');
        expect(generateApiKey).toHaveBeenCalled();
        expect(hashApiKey).toHaveBeenCalledWith(mockApiKey);
        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should throw error if user update fails', async () => {
        // Mocking generateApiKey and hashApiKey
        generateApiKey.mockReturnValue(mockApiKey);
        hashApiKey.mockReturnValue('hashed-api-key');
        
        // Mocking prisma.$transaction to throw an error
        prisma.$transaction.mockRejectedValue(new Error('Database update failed'));
        
        try {
            await serviceAuthentication.createAPIKey(mockUserId);
        } catch (e) {
            expect(e.message).toBe('An error occured while creating the API key');
        }
    });

    it('should log error when transaction fails', async () => {
        // Mocking generateApiKey and hashApiKey
        generateApiKey.mockReturnValue(mockApiKey);
        hashApiKey.mockReturnValue('hashed-api-key');
        
        // Mocking prisma.$transaction to simulate failure
        prisma.$transaction.mockRejectedValue(new Error('Transaction failed'));
        
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        
        await serviceAuthentication.createAPIKey(mockUserId);
        
        expect(consoleSpy).toHaveBeenCalledWith('Transaction rolled back due to error:', expect.any(Error));
        consoleSpy.mockRestore();
    });

    it('should handle error thrown in catch block', async () => {
        // Mocking generateApiKey and hashApiKey
        generateApiKey.mockReturnValue(mockApiKey);
        hashApiKey.mockReturnValue('hashed-api-key');
        
        // Mocking prisma.$transaction to simulate an error in the transaction
        prisma.$transaction.mockRejectedValue(new Error('Something went wrong'));
        
        try {
            await serviceAuthentication.createAPIKey(mockUserId);
        } catch (e) {
            expect(e.message).toBe('Transaction rolled back due to error:');
        }
    });
});
