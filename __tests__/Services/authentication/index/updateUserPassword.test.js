import prisma from "../../../../dist/prisma/client.js";  // Import Prisma client
import { updateUserPassword } from "../../../../dist/services/authentication/index.js";  // Import the function

// Mock the Prisma client
jest.mock("../../../../dist/prisma/client.js", () => ({
    user: {
        update: jest.fn(), // Mock the update method
        findUnique: jest.fn(), // If you need to mock findUnique as well
    },
}));

describe('updateUserPassword', () => {
    test('should update the password for a valid user', async () => {
        const userId = 1;
        const hashedPassword = 'hashed_password_123';

        // Mock the Prisma update method to resolve without throwing any error
        prisma.user.update.mockResolvedValue({
            id: userId,
            password: hashedPassword,
        });

        await updateUserPassword(userId, hashedPassword);

        // Ensure the Prisma update method was called with the correct parameters
        expect(prisma.user.update).toHaveBeenCalledWith({
            where: { id: userId },
            data: { password: hashedPassword },
        });
    });

    test('should throw an error if update fails', async () => {
        const userId = 1;
        const hashedPassword = 'hashed_password_123';

        // Mock the Prisma update method to reject with an error
        const mockError = new Error('Update failed');
        prisma.user.update.mockRejectedValue(mockError);

        // Ensure that the error is thrown when update fails
        await expect(updateUserPassword(userId, hashedPassword)).rejects.toThrow('Update failed');

        // Ensure the Prisma update method was called with the correct parameters
        expect(prisma.user.update).toHaveBeenCalledWith({
            where: { id: userId },
            data: { password: hashedPassword },
        });
    });
});
