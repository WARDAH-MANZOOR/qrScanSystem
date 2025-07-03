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

describe("getUsers", () => {
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
    it("should return users for a given merchantId", async () => {
        prisma.userGroup.findMany.mockResolvedValue([
            { user: mockUser, group: mockGroups[0] },
            { user: mockUser, group: mockGroups[1] }
        ]);

        const result = await userService.getUsers("merchant123");

        expect(prisma.userGroup.findMany).toHaveBeenCalledWith({
            where: { merchantId: "merchant123" },
            include: { user: true, group: true },
        });
        expect(result).toEqual([mockUser, mockUser]);
    });

    it("should return null if no users exist for a given merchantId", async () => {
        prisma.userGroup.findMany.mockResolvedValue([]);

        const result = await userService.getUsers("merchant123");

        expect(result).toEqual([]);
    });

})