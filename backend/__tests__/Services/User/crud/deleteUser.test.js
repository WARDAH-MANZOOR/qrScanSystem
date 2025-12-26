import bcrypt from "bcrypt";
import prisma from "../../../../dist/prisma/client.js";
import userService from "../../../../dist/services/user/crud.js";

// Mock Prisma client
jest.mock("../../../../dist/prisma/client.js", () => ({
    $transaction: jest.fn(),
    user: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    userGroup: {
        findMany: jest.fn(),
    }
}));

describe("deleteUser", () => {
    const mockUser = {
        id: "user123",
        username: "John Doe",
        email: "john@example.com",
        password: "hashedpassword",
    };

    const mockGroups = [
        { groupId: "group1", merchantId: "merchant123" },
        { groupId: "group2", merchantId: "merchant123" },
    ];

    afterEach(() => {
        jest.clearAllMocks();
    });
    it("should delete a user successfully", async () => {
        prisma.user.delete.mockResolvedValue(mockUser);

        const result = await userService.deleteUser("user123", "merchant123");

        expect(prisma.user.delete).toHaveBeenCalledWith({
            where: { id: "user123", groups: { every: { merchantId: "merchant123" } } },
        });
        expect(result).toEqual(mockUser);
    });

    it("should return null if the user does not exist", async () => {
        prisma.user.delete.mockResolvedValue(null);

        const result = await userService.deleteUser("invalidUser", "merchant123");

        expect(result).toBeNull();
    });
})