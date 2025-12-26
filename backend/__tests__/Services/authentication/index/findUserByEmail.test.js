import prisma from "../../../../dist/prisma/client.js";  // Import Prisma client
import { findUserByEmail } from "../../../../dist/services/authentication/index.js";  // Import the function

// Mock the Prisma client
jest.mock("../../../../dist/prisma/client.js", () => ({
    user: {
        findUnique: jest.fn(),
    },
}));
describe("findUserByEmail", () => {
    afterEach(() => {
        jest.clearAllMocks(); // Clear mocks after each test
    });

    test("should return user when user exists", async () => {
        const email = "test@example.com";
        const mockUser = {
            id: 1,
            email,
            name: "Test User",
        };

        // Mock Prisma's findUnique method
        prisma.user.findUnique.mockResolvedValue(mockUser);

        const result = await findUserByEmail(email);

        // Assertions
        expect(prisma.user.findUnique).toHaveBeenCalledWith({
            where: { email },
        });
        expect(result).toEqual(mockUser);
    });

    test("should return null when no user is found", async () => {
        const email = "nonexistent@example.com";

        // Mock Prisma's findUnique method to return null
        prisma.user.findUnique.mockResolvedValue(null);

        const result = await findUserByEmail(email);

        // Assertions
        expect(prisma.user.findUnique).toHaveBeenCalledWith({
            where: { email },
        });
        expect(result).toBeNull();
    });

    test("should throw an error when Prisma throws an error", async () => {
        const email = "error@example.com";
        const mockError = new Error("Database error");

        // Mock Prisma's findUnique to throw an error
        prisma.user.findUnique.mockRejectedValue(mockError);

        // Call the function and catch the error
        await expect(findUserByEmail(email)).rejects.toThrow("Database error");

        // Assertions
        expect(prisma.user.findUnique).toHaveBeenCalledWith({
            where: { email },
        });
    });
});
