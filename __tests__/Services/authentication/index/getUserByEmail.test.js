import prisma from "../../../../dist/prisma/client.js";
import { getUserByEmail } from "../../../../dist/services/authentication/index.js";

// Mock the Prisma client
jest.mock("../../../../dist/prisma/client.js", () => ({
    user: {
        findUnique: jest.fn(),
    },
}));

describe("getUserByEmail", () => {
    afterEach(() => {
        jest.clearAllMocks(); // Clear mocks after each test
    });

    test("should fetch user with groups and group details when user exists", async () => {
        // Mock data
        const email = "test@example.com";
        const mockUser = {
            id: 1,
            email,
            name: "Test User",
            groups: [
                {
                    group: {
                        id: 1,
                        name: "Test Group",
                    },
                },
            ],
        };

        // Mock Prisma's findUnique
        prisma.user.findUnique.mockResolvedValue(mockUser);

        // Call the function
        const result = await getUserByEmail(email);

        // Assertions
        expect(prisma.user.findUnique).toHaveBeenCalledWith({
            where: { email },
            include: {
                groups: {
                    include: {
                        group: true,
                    },
                },
            },
        });
        expect(result).toEqual(mockUser);
    });

    test("should return null when no user is found", async () => {
        // Mock data
        const email = "nonexistent@example.com";

        // Mock Prisma's findUnique
        prisma.user.findUnique.mockResolvedValue(null);

        // Call the function
        const result = await getUserByEmail(email);

        // Assertions
        expect(prisma.user.findUnique).toHaveBeenCalledWith({
            where: { email },
            include: {
                groups: {
                    include: {
                        group: true,
                    },
                },
            },
        });
        expect(result).toBeNull();
    });

    test("should throw an error when Prisma throws an error", async () => {
        // Mock data
        const email = "error@example.com";

        // Mock Prisma's findUnique to throw an error
        const mockError = new Error("Database error");
        prisma.user.findUnique.mockRejectedValue(mockError);

        // Call the function and catch the error
        await expect(getUserByEmail(email)).rejects.toThrow("Database error");

        // Assertions
        expect(prisma.user.findUnique).toHaveBeenCalledWith({
            where: { email },
            include: {
                groups: {
                    include: {
                        group: true,
                    },
                },
            },
        });
    });
});
