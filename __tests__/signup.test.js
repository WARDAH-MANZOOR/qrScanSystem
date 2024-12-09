import { signup } from "../dist/controller/authentication/index.js";
import { validationResult } from "express-validator";
import CustomError from "../dist/utils/custom_error.js";
import {
  findUserByEmail,
  hashPassword,
  updateUserPassword,
  generateToken,
} from "../dist/services/authentication/index.js";

jest.mock("../dist/prisma/client.js", () => ({
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock("../dist/utils/custom_error.js", () => {
  return jest.fn().mockImplementation((message, statusCode) => ({
    message,
    statusCode,
  }));
});


jest.mock("../dist/utils/ApiResponse.js", () => ({
  success: jest.fn((data) => ({ status: "success", data })),
  error: jest.fn((message) => ({ status: "error", message })),
}));

jest.mock("../dist/services/authentication/index.js", () => ({
  findUserByEmail: jest.fn(),
  hashPassword: jest.fn(),
  updateUserPassword: jest.fn(),
  generateToken: jest.fn(),
}));

jest.mock("express-validator", () => ({
  validationResult: jest.fn(),
}));

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => { }); // Suppress console.error
});

afterAll(() => {
  console.error.mockRestore(); // Restore original console.error after tests
});


describe("Signup API Route", () => {
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

  it("should return 500 if validation errors are present", async () => {
    validationResult.mockReturnValueOnce({
      isEmpty: () => false,  // Simulate validation errors
      array: () => [{ msg: "A valid email is required" }],
    });

    await signup(req, res, next);
    console.log(res.json)

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Internal server error",
      status: "error",
    });
  });

  it("should return 500 if user is not found", async () => {
    validationResult.mockReturnValueOnce({
      isEmpty: () => true, // No validation errors
    });

    findUserByEmail.mockResolvedValueOnce(null);  // Simulate user not found

    await signup(req, res, next);

    // Ensure CustomError was thrown with status 400
    expect(CustomError).toHaveBeenCalledWith("You are not registered. Please contact support.", 400);

    // Ensure the error response is sent with status 400
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      message: "Internal server error",
    });
  });


  it("should hash password, update user, and return success response", async () => {
    const user = { id: 1, email: "bilal@gmail.com" };
    validationResult.mockReturnValueOnce({
      isEmpty: () => true,
    });
    findUserByEmail.mockResolvedValueOnce(user);
    hashPassword.mockResolvedValueOnce("hashed_password");
    updateUserPassword.mockResolvedValueOnce(true);
    generateToken.mockReturnValueOnce("jwt_token");

    await signup(req, res, next);

    expect(findUserByEmail).toHaveBeenCalledWith("bilal@gmail.com");
    expect(hashPassword).toHaveBeenCalledWith("test12");
    expect(updateUserPassword).toHaveBeenCalledWith(1, "hashed_password");
    expect(generateToken).toHaveBeenCalledWith({
      email: "bilal@gmail.com",
      id: 1,
      role: "user",
    });
    expect(res.cookie).toHaveBeenCalledWith("token", "jwt_token", { httpOnly: true });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: "success",
      data: {
        message: "Signup successful.",
        token: "jwt_token",
        user: { id: 1, email: "bilal@gmail.com" },
      },
    });
  });

  it("should handle unexpected errors", async () => {
    const error = new CustomError("You are not registered. Please contact support.",400);
    validationResult.mockReturnValueOnce({
      isEmpty: () => true,
    });
    findUserByEmail.mockRejectedValueOnce(error);  // Simulate unexpected error

    await signup(req, res, next);

    // Ensure that the error is passed to the next middleware
    expect(next).toHaveBeenCalledWith(error);
  });
});