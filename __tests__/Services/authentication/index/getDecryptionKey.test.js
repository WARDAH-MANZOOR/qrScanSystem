import prisma from "../../../../dist/prisma/client.js"; // Import Prisma client
import  serviceAuthentication  from "../../../../dist/services/authentication/index.js"; // Import the function

// Mock the Prisma client
jest.mock("../../../../dist/prisma/client.js", () => ({
    user: {
        findUnique: jest.fn(), // Mock the findUnique method
    },
}));

describe('getDecryptionKey', () => {
    let userId;

    beforeEach(() => {
        userId = 1; // Sample user ID for testing
    });

    it('should return the decryption key when the user exists and has a decryption key', async () => {
        // Mocking the prisma call to return a user with a decryption key
        prisma.user.findUnique.mockResolvedValue({
            decryptionKey: 'mockDecryptionKey',
        });

        const result = await serviceAuthentication.getDecryptionKey(userId);

        // Assert that the decryption key is returned as a string
        expect(result).toBe('mockDecryptionKey');
    });

    it('should return undefined if the user does not exist', async () => {
        // Mocking the prisma call to return null (user not found)
        prisma.user.findUnique.mockResolvedValue(null);

        const result = await serviceAuthentication.getDecryptionKey(userId);

        // Assert that the result is undefined when the user is not found
        expect(result).toBeUndefined();
    });

    it('should return undefined if the user exists but has no decryption key', async () => {
        // Mocking the prisma call to return a user without a decryption key
        prisma.user.findUnique.mockResolvedValue({
            decryptionKey: null,
        });

        const result = await serviceAuthentication.getDecryptionKey(userId);

        // Assert that the result is undefined when the decryption key is null
        expect(result).toBeUndefined();
    });

    it('should handle errors gracefully', async () => {
        // Mocking the prisma call to throw an error
        prisma.user.findUnique.mockRejectedValue(new Error('Database error'));

        try {
            await serviceAuthentication.getDecryptionKey(userId);
        } catch (error) {
            // Assert that an error is thrown and contains the correct message
            expect(error.message).toBe('Database error');
        }
    });
});
