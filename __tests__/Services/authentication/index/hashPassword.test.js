import bcrypt from "bcrypt";
import { hashPassword } from "../../../../dist/services/authentication/index.js";  // Import the function
import CustomError from "../../../../dist/utils/custom_error.js";  // Import CustomError for error handling

jest.mock("bcrypt");  // Mock bcrypt module

describe("hashPassword", () => {
    test("should hash the password successfully", async () => {
        const password = "password123";
        const mockSalt = "random_salt";
        const mockHash = "hashed_password";

        // Mock bcrypt.genSalt and bcrypt.hash
        bcrypt.genSalt.mockResolvedValue(mockSalt);
        bcrypt.hash.mockResolvedValue(mockHash);

        const result = await hashPassword(password);

        // Assertions
        expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
        expect(bcrypt.hash).toHaveBeenCalledWith(password, mockSalt);
        expect(result).toBe(mockHash);
    });

    test("should throw an error if salt generation fails", async () => {
        const password = "password123";
        const mockError = new CustomError("An error occurred while creating the salt", 500);  // Corrected spelling of "occurred"
    
        // Mock bcrypt.genSalt to throw an error
        bcrypt.genSalt.mockRejectedValue(mockError);
    
        // Now the test case should expect the exact message returned by the CustomError
        await expect(hashPassword(password)).rejects.toThrow("An error occurred while creating the salt");  // Corrected expected message
    
        // Assertions
        expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
    });
    

    test("should throw an error if hash fails", async () => {
        const password = "password123";
        const mockSalt = "random_salt";
        const mockError = new Error("Hashing error");

        // Mock bcrypt.genSalt and bcrypt.hash
        bcrypt.genSalt.mockResolvedValue(mockSalt);
        bcrypt.hash.mockRejectedValue(mockError);

        await expect(hashPassword(password)).rejects.toThrow("Hashing error");

        // Assertions
        expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
        expect(bcrypt.hash).toHaveBeenCalledWith(password, mockSalt);
    });
});
