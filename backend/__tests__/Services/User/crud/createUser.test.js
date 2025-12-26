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

describe("createUser", () => {
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

    // Test case: Create User
    it("should create a user and assign groups", async () => {
        const bcryptHashSpy = jest.spyOn(bcrypt, "hash").mockResolvedValue("hashedpassword");

        prisma.$transaction.mockImplementation(async (callback) => {
            return await callback({
                user: {
                    create: jest.fn().mockResolvedValue(mockUser),
                    update: jest.fn().mockResolvedValue(mockUser),
                },
            });
        });

        const result = await userService.createUser("John Doe", "john@example.com", "password123", ["group1", "group2"], "merchant123");

        expect(bcryptHashSpy).toHaveBeenCalledWith("password123", 10);
        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockUser);
    });
});