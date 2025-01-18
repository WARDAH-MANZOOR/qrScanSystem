import jwt from "jsonwebtoken";
import { generateToken } from "../../../../dist/services/authentication/index.js";

jest.mock("jsonwebtoken");

describe("generateToken", () => {
    afterEach(() => {
        jest.clearAllMocks(); // Clear mocks after each test
    });

    test("should generate a token with the provided payload", () => {
        // Mock payload and token
        const payload = { id: 1, email: "test@example.com" };
        const mockToken = "mock.jwt.token";

        // Mock jwt.sign
        jwt.sign.mockReturnValue(mockToken);

        // Call the function
        const result = generateToken(payload);

        // Assertions
        expect(jwt.sign).toHaveBeenCalledWith(
            payload,
            process.env.JWT_SECRET || "default_secret",
            { expiresIn: "1h" }
        );
        expect(result).toBe(mockToken);
    });

    test("should use the default secret if JWT_SECRET is not defined", () => {
        // Backup and delete JWT_SECRET from environment
        const originalJwtSecret = process.env.JWT_SECRET;
        delete process.env.JWT_SECRET;

        // Mock payload and token
        const payload = { id: 2, email: "default@example.com" };
        const mockToken = "default.jwt.token";

        // Mock jwt.sign
        jwt.sign.mockReturnValue(mockToken);

        // Call the function
        const result = generateToken(payload);

        // Assertions
        expect(jwt.sign).toHaveBeenCalledWith(
            payload,
            "default_secret",
            { expiresIn: "1h" }
        );
        expect(result).toBe(mockToken);

        // Restore original JWT_SECRET
        process.env.JWT_SECRET = originalJwtSecret;
    });

    test("should throw an error if jwt.sign fails", () => {
        // Mock payload
        const payload = { id: 3, email: "error@example.com" };

        // Mock jwt.sign to throw an error
        const mockError = new Error("JWT signing failed");
        jwt.sign.mockImplementation(() => {
            throw mockError;
        });

        // Call the function and catch the error
        expect(() => generateToken(payload)).toThrow("JWT signing failed");

        // Assertions
        expect(jwt.sign).toHaveBeenCalledWith(
            payload,
            process.env.JWT_SECRET || "default_secret",
            { expiresIn: "1h" }
        );
    });
});
