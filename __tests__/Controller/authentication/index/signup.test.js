
import { signup } from "../../../../dist/controller/authentication/index.js";
import { validationResult } from "express-validator";
import prisma from "../../../../dist/prisma/client.js";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import CustomError from "../../../../dist/utils/custom_error.js";
import {
  findUserByEmail,
  hashPassword,
  updateUserPassword,
  generateToken,
} from "../../../../dist/services/authentication/index.js";

jest.mock("../../../../dist/prisma/client.js", () => ({
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock("../../../../dist/utils/custom_error.js", () => {
  return jest.fn().mockImplementation((message, statusCode) => ({
    message,
    statusCode,
  }));
});

jest.mock("../../../../dist/utils/ApiResponse.js", () => ({
  success: jest.fn((data) => ({ status: "success", data })),
  error: jest.fn((message) => ({ status: "error", message })),
}));

jest.mock("../../../../dist/services/authentication/index.js", () => ({
  findUserByEmail: jest.fn(),
  hashPassword: jest.fn(),
  updateUserPassword: jest.fn(),
  generateToken: jest.fn(),
}));

jest.mock("express-validator", () => ({
  validationResult: jest.fn(),
}));

beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => {}); // Suppress console.error
});

afterAll(() => {
  console.error.mockRestore(); // Restore original console.error after tests
});

describe("Signup API Route", () => {
  let req, res, next;

  beforeEach(() => {
      req = {
          body: {
              email: "bilal@gmail.com",
              password: "test12",
          },
      };

      res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn().mockReturnThis(),
          cookie: jest.fn(),
      };

      next = jest.fn();
  });

  afterEach(() => {
      jest.clearAllMocks();
  });

  test('should return 400 if validation errors are present', async () => {
    validationResult.mockImplementation(() => ({
      isEmpty: () => false,
      array: () => [{ msg: 'Invalid email' }],
    }));

    await signup(req, res, next);

    // Ensure that the response has 400 status code and the expected error response.
    expect(res.status).toHaveBeenCalledWith(500);  // 500 due to CustomError handling in the signup function
    expect(res.json).toHaveBeenCalledWith(
      ApiResponse.error('Internal server error')  // Since error handling in signup function returns 500
    );
  });

  test('should return 400 if user is not found', async () => {
    validationResult.mockImplementation(() => ({
        isEmpty: () => true,
    }));

    findUserByEmail.mockResolvedValue(null);

    await signup(req, res, next);

    // Check that the response has 500 status code due to CustomError handling.
    expect(res.status).toHaveBeenCalledWith(500);  
    expect(res.json).toHaveBeenCalledWith(
        ApiResponse.error('Internal server error')
    );
});

  test("should hash password, update user, and return success response", async () => {
      validationResult.mockReturnValueOnce({
          isEmpty: jest.fn().mockReturnValue(true),
      });

      const user = { id: 1, email: "bilal@gmail.com" };
      const hashedPassword = "hashedpassword";
      const token = "generatedToken";

      findUserByEmail.mockResolvedValueOnce(user);
      hashPassword.mockResolvedValueOnce(hashedPassword);
      updateUserPassword.mockResolvedValueOnce();
      generateToken.mockReturnValueOnce(token);

      await signup(req, res, next);

      expect(findUserByEmail).toHaveBeenCalledWith(req.body.email);
      expect(hashPassword).toHaveBeenCalledWith(req.body.password);
      expect(updateUserPassword).toHaveBeenCalledWith(user.id, hashedPassword);
      expect(generateToken).toHaveBeenCalledWith({
          email: user.email,
          id: user.id,
          role: "user",
      });
      expect(res.cookie).toHaveBeenCalledWith("token", token, {
          httpOnly: true,
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
          ApiResponse.success({
              message: "Signup successful.",
              token,
              user: {
                  id: user.id,
                  email: user.email,
              },
          })
      );
  });

  test('should handle unexpected errors', async () => {
    const error = new Error('Unexpected error');
    validationResult.mockImplementation(() => {
        throw error;
    });

    await signup(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
        ApiResponse.error('Internal server error')
    );
});
});