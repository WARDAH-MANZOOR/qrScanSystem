import { login } from "../../../../dist/controller/authentication/index.js";
import { validationResult } from "express-validator";
import CustomError from "../../../../dist/utils/custom_error.js";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import { comparePasswords, getUserByEmail, generateToken, setTokenCookie } from "../../../../dist/services/authentication/index.js";
import prisma from "../../../../dist/prisma/client.js";

jest.mock("../../../../dist/services/authentication/index.js", () => ({
  comparePasswords: jest.fn(),
  getUserByEmail: jest.fn(),
  generateToken: jest.fn(),
  setTokenCookie: jest.fn(),
}));

jest.mock("express-validator", () => ({
    validationResult: jest.fn().mockReturnValue({
      isEmpty: jest.fn().mockReturnValue(true),  // Default to no validation errors
      array: jest.fn().mockReturnValue([]), // Empty error array
    }),
  }));
  

jest.mock("../../../../dist/utils/ApiResponse.js", () => ({
  success: jest.fn((data) => ({ status: "success", data })),
  error: jest.fn((message) => ({ status: "error", message })),
}));

jest.mock("../../../../dist/utils/custom_error.js", () => {
  return jest.fn().mockImplementation((message, statusCode) => ({
    message,
    statusCode,
  }));
});

describe("Login API Route", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: { email: "bilal@gmail.com", password: "test12" },
    };
    res = {
      cookie: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it("should return 400 if validation errors are present", async () => {
    validationResult.mockReturnValueOnce({
      isEmpty: () => false,  // Simulate validation errors
      array: () => [{ msg: "Invalid email" }],
    });

    await login(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ errors: [{ msg: "Invalid email" }] });
  });

  it("should return 401 if user is not found", async () => {
    validationResult.mockReturnValueOnce({
      isEmpty: () => true,  // No validation errors
    });

    getUserByEmail.mockResolvedValueOnce(null);  // Simulate user not found

    await login(req, res, next);

    expect(CustomError).toHaveBeenCalledWith("Invalid email or password", 401);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      message: "Invalid email or password",
    });
  });

  it("should return 400 if user has no password set", async () => {
    validationResult.mockReturnValueOnce({
      isEmpty: () => true,
    });

    const user = { id: 1, email: "bilal@gmail.com", password: "" };  // User has no password
    getUserByEmail.mockResolvedValueOnce(user);

    await login(req, res, next);

    expect(CustomError).toHaveBeenCalledWith("Please sign up first with the given email", 400);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      message: "Please sign up first with the given email",
    });
  });

  it("should return 401 if password is incorrect", async () => {
    validationResult.mockReturnValueOnce({
      isEmpty: () => true,
    });

    const user = { id: 1, email: "bilal@gmail.com", password: "hashed_password" };
    getUserByEmail.mockResolvedValueOnce(user);

    comparePasswords.mockResolvedValueOnce(false);  // Simulate incorrect password

    await login(req, res, next);

    expect(CustomError).toHaveBeenCalledWith("Invalid email or password", 401);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      message: "Invalid email or password",
    });
  });

  it("should return 200 and token if login is successful", async () => {
    validationResult.mockReturnValueOnce({
      isEmpty: () => true,
    });

    const user = { id: 1, email: "bilal@gmail.com", password: "hashed_password", groups: [{ group: { name: "admin" } }] };
    getUserByEmail.mockResolvedValueOnce(user);
    comparePasswords.mockResolvedValueOnce(true);  // Simulate correct password
    generateToken.mockReturnValueOnce("jwt_token");
    setTokenCookie.mockImplementation(() => {});

    const merchant = [{ merchantId: 1, merchant: { uid: "abc", commissions: [{ amount: 10 }] } }];
    prisma.userGroup.findMany = jest.fn().mockResolvedValueOnce(merchant);

    await login(req, res, next);

    expect(generateToken).toHaveBeenCalledWith({
      email: "bilal@gmail.com",
      role: "admin",
      id: 1,
      merchant_id: 1,
    });
    expect(setTokenCookie).toHaveBeenCalledWith(res, "jwt_token");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: "success",
      data: expect.objectContaining({
        message: "Login successful.",
        token: "jwt_token",
        role: "admin",
        username: undefined,
        email: "bilal@gmail.com",
        id: 1,
        merchantId: 1,
        uid: "abc",
        merchant: expect.any(Object),
        commission: expect.any(Object),
      }),
    });
  });

  it("should handle unexpected errors", async () => {
    const error = new CustomError("Something went wrong!", 500); // Expected CustomError
  
    // Mock validation result to return valid object (even if there are no errors)
    validationResult.mockReturnValue({
      isEmpty: jest.fn().mockReturnValue(true),  // No validation errors
      array: jest.fn().mockReturnValue([]),
    });
  
    getUserByEmail.mockRejectedValueOnce(error); // Simulating error
  
    // Mock console.error to prevent output in test logs
    console.error = jest.fn();
  
    await login(req, res, next);
  
    // Ensure the next() method is called with the error
    expect(next).toHaveBeenCalledWith(error); // Ensuring next is called with the CustomError
    expect(console.error).toHaveBeenCalledWith(error); // Ensuring console.error was called
  });
  
});
