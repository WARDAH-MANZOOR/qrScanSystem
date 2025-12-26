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
beforeEach(() => {
    jest.clearAllMocks(); // Reset mock state before each test
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
    jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.error
});

  afterEach(() => {
    console.error.mockRestore(); // Restore console.error after tests
  });
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
    it("should update a user successfully", async () => {
        const updatedUser = { ...mockUser, username: "Updated Name" };
        prisma.user.update.mockResolvedValue(updatedUser);

        const result = await userService.updateUser("user123", "Updated Name", "john@example.com", "merchant123", ["group1"], "newpassword");

        expect(prisma.user.update).toHaveBeenCalledWith({
            where: { id: "user123", groups: { every: { merchantId: "merchant123" } } },
            data: { username: "Updated Name", email: "john@example.com", password: expect.any(String) },
        });
        expect(result).toEqual(updatedUser);
    });

    it("should return null if the user does not exist or update fails", async () => {
        prisma.user.update.mockResolvedValue(null);

        const result = await userService.updateUser("invalidUser", "Updated Name", "john@example.com", "merchant123", ["group1"], "newpassword");

        expect(result).toBeNull();
    });
})