import bcrypt from "bcrypt";
import { comparePasswords } from "../../../../dist/services/authentication/index.js";

// Mock bcrypt.compare
jest.mock("bcrypt", () => ({
    compare: jest.fn(),
}));

describe("comparePasswords", () => {
    afterEach(() => {
        jest.clearAllMocks(); // Clear mocks after each test
    });

    test("should return true when the password matches the hashed password", async () => {
        // Mock bcrypt.compare to return true
        bcrypt.compare.mockResolvedValue(true);

        // Input data
        const password = "password123";
        const hashedPassword = "$2b$10$WzPhYFbsU/NhXvPZ65zReeCUFhZFS8d6I8S5tPLGvbdqFd0Xz9t.q"; // Example hash

        // Call the function
        const result = await comparePasswords(password, hashedPassword);

        // Assertions
        expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
        expect(result).toBe(true);
    });

    test("should return false when the password does not match the hashed password", async () => {
        // Mock bcrypt.compare to return false
        bcrypt.compare.mockResolvedValue(false);

        // Input data
        const password = "wrongPassword";
        const hashedPassword = "$2b$10$WzPhYFbsU/NhXvPZ65zReeCUFhZFS8d6I8S5tPLGvbdqFd0Xz9t.q"; // Example hash

        // Call the function
        const result = await comparePasswords(password, hashedPassword);

        // Assertions
        expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
        expect(result).toBe(false);
    });

    test("should throw an error when bcrypt.compare throws an error", async () => {
        // Mock bcrypt.compare to throw an error
        const mockError = new Error("bcrypt error");
        bcrypt.compare.mockRejectedValue(mockError);

        // Input data
        const password = "password123";
        const hashedPassword = "$2b$10$WzPhYFbsU/NhXvPZ65zReeCUFhZFS8d6I8S5tPLGvbdqFd0Xz9t.q";

        // Call the function and catch the error
        await expect(comparePasswords(password, hashedPassword)).rejects.toThrow("bcrypt error");

        // Assertions
        expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
    });
});
