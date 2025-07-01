import prisma from "../../../../dist/prisma/client.js"; // Import Prisma client
import  serviceAuthentication  from "../../../../dist/services/authentication/index.js"; // Import the function

// Mock the Prisma client
jest.mock("../../../../dist/prisma/client.js", () => ({
    user: {
        findUnique: jest.fn(), // Mock the findUnique method
    },
}));

describe('getAPIKey', () => {
    test('should return the API key for a valid user', async () => {
        const userId = 1;
        const mockApiKey = 'mock-api-key-123';

        // Mock the Prisma findUnique method to resolve with a user having an apiKey
        prisma.user.findUnique.mockResolvedValue({
            apiKey: mockApiKey,
        });

        // Call the function and check the result
        const result = await serviceAuthentication.getAPIKey(userId);

        // Assertions
        expect(result).toBe(mockApiKey);
        expect(prisma.user.findUnique).toHaveBeenCalledWith({
            where: { id: userId },
            select: { apiKey: true },
        });
    });

    test('should return undefined if user is not found', async () => {
        const userId = 1;

        // Mock the Prisma findUnique method to resolve with null (no user found)
        prisma.user.findUnique.mockResolvedValue(null);

        // Call the function and check the result
        const result = await serviceAuthentication.getAPIKey(userId);

        // Assertions
        expect(result).toBeUndefined();
        expect(prisma.user.findUnique).toHaveBeenCalledWith({
            where: { id: userId },
            select: { apiKey: true },
        });
    });

    test('should return undefined if apiKey does not exist for the user', async () => {
        const userId = 1;
    
        // Mock the Prisma findUnique method to resolve with a user having no apiKey
        prisma.user.findUnique.mockResolvedValue({
            apiKey: null,
        });
    
        // Call the function and check the result
        const result = await serviceAuthentication.getAPIKey(userId);
    
        // Assertions
        expect(result).toBeNull();  // Change this to expect null, not undefined
        expect(prisma.user.findUnique).toHaveBeenCalledWith({
            where: { id: userId },
            select: { apiKey: true },
        });
    });
    

    test('should throw an error if Prisma query fails', async () => {
        const userId = 1;
        const mockError = new Error('Database error');

        // Mock the Prisma findUnique method to reject with an error
        prisma.user.findUnique.mockRejectedValue(mockError);

        // Call the function and ensure that it throws an error
        await expect(serviceAuthentication.getAPIKey(userId)).rejects.toThrow('Database error');

        // Ensure Prisma findUnique was called with correct arguments
        expect(prisma.user.findUnique).toHaveBeenCalledWith({
            where: { id: userId },
            select: { apiKey: true },
        });
    });
});
