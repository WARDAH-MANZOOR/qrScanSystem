import { logout } from "../../../../dist/controller/authentication/index.js";
import { validationResult } from "express-validator";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import { body } from 'express-validator';



jest.mock('express-validator', () => ({
    body: jest.fn().mockReturnValue({
      isEmail: jest.fn().mockReturnThis(),    // Mock isEmail
      withMessage: jest.fn().mockReturnThis(), // Mock withMessage
      notEmpty: jest.fn().mockReturnThis(),    // Mock notEmpty
      normalizeEmail: jest.fn().mockReturnThis(), // Mock normalizeEmail
      isLength: jest.fn().mockReturnThis(),    // Mock isLength
    }),
    validationResult: jest.fn().mockReturnValue({
      isEmpty: jest.fn().mockReturnValue(true),  // Default to no validation errors
      array: jest.fn().mockReturnValue([]),     // Empty error array
    }),
  }));
  
  

describe("Logout API Route", () => {
    let req, res, next;

    beforeEach(() => {
        req = {};  // No need for request body data in logout
        res = {
            cookie: jest.fn(),
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        next = jest.fn();

        // Reset mocks before each test
        jest.clearAllMocks();
    });

    it("should clear the token cookie and return 200 with success message", async () => {
        // Call logout function
        await logout(req, res, next);

        // Ensure the 'cookie' method was called to clear the token
        expect(res.cookie).toHaveBeenCalledWith("token", "", {
            httpOnly: true,
            expires: new Date(0),
        });

        // Ensure the response status is set to 200
        expect(res.status).toHaveBeenCalledWith(200);

        // Ensure the correct success message is sent
        expect(res.send).toHaveBeenCalledWith({ message: "Logged out Successfully" });
    });
});
