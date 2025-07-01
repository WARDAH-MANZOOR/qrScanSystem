import { setTokenCookie } from "../../../../dist/services/authentication/index.js";

describe("setTokenCookie", () => {
    let mockResponse;

    beforeEach(() => {
        // Mock the response object
        mockResponse = {
            cookie: jest.fn(),
        };
    });

    afterEach(() => {
        jest.clearAllMocks(); // Clear mocks after each test
    });

    test("should set the cookie with correct options in production environment", () => {
        // Mock environment variable
        process.env.NODE_ENV = "production";

        // Mock token
        const token = "testToken";

        // Call the function
        setTokenCookie(mockResponse, token);

        // Assertions
        expect(mockResponse.cookie).toHaveBeenCalledWith("token", token, {
            httpOnly: true,
            secure: true, // Secure should be true
            sameSite: "none", // Should be 'none' for cross-site cookies
            // domain: ".sahulatpay.com",
            path: "/",
        });
    });

    test("should set the cookie with correct options in non-production environment", () => {
        // Mock environment variable
        process.env.NODE_ENV = "development";

        // Mock token
        const token = "testToken";

        // Call the function
        setTokenCookie(mockResponse, token);

        // Assertions
        expect(mockResponse.cookie).toHaveBeenCalledWith("token", token, {
            httpOnly: true,
            secure: true, // Secure should be true
            sameSite: "none", // Should be 'none' for cross-site cookies
            domain: ".sahulatpay.com",
            path: "/",
        });
    });

    test("should throw an error if res.cookie is not a function", () => {
        // Mock response object without a `cookie` function
        const invalidResponse = {};

        // Mock token
        const token = "testToken";

        // Import function dynamically
        const { setTokenCookie } = require("../../../../dist/services/authentication/index.js");

        // Call the function and expect an error
        expect(() => setTokenCookie(invalidResponse, token)).toThrow(
            "res.cookie is not a function"
        );
    });
});
