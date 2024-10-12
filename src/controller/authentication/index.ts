import { NextFunction, Request, Response } from "express";
import prisma from "prisma/client.js";
import CustomError from "utils/custom_error.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { validationResult } from "express-validator";
import {
  comparePasswords,
  findUserByEmail,
  generateToken,
  getUserByEmail,
  hashPassword,
  setTokenCookie,
  updateUserPassword,
} from "services/authentication/index.js";
import ApiResponse from "utils/ApiResponse.js";

const logout = async (req: Request, res: Response) => {
  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).send({ message: "Logged out Successfully" });
};

const login = async (req: Request, res: Response, next: NextFunction) => {
  // Validate request data
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Return validation errors
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // Fetch user by email
    const user = await getUserByEmail(email);

    if (!user) {
      const error = new CustomError("Invalid email or password", 401);
      res.status(401).json(ApiResponse.error(error.message));
      return;
    }

    if (!user.password || user.password.trim() === "") {
      const error = new CustomError(
        "Please sign up first with the given email",
        400
      );
      res.status(400).json(ApiResponse.error(error.message));
      return;
    }
    // Compare passwords
    const isPasswordValid = await comparePasswords(
      password,
      user?.password as string
    );
    if (!isPasswordValid) {
      const error = new CustomError("Invalid email or password", 401);
      res.status(401).json(ApiResponse.error(error.message));
      return;
    }

    // Extract the group name (role) from the user's groups
    const userGroup = user?.groups[0]; // Assuming one group per user
    const role = userGroup ? userGroup.group.name : "User"; // Default role if no group found
    const merchant = await prisma.userGroup.findMany({
      where: {
        userId: user?.id
      },
      include: {
        merchant: true
      }
    })
    // Generate JWT token
    const token = generateToken({
      email: user?.email,
      role,
      id: user?.id,
      merchant_id: merchant[0]?.merchantId,
    });

    // Set token in cookies
    setTokenCookie(res, token);

    // Return user details
    res.status(200).json(
      ApiResponse.success({
        message: "Login successful.",
        token: token,
        role: role,
        username: user?.username,
        email: user?.email,
        id: user?.id,
        merchantId: merchant[0]?.merchantId,
        uid: merchant[0]?.merchant?.uid,
      })
    );
  } catch (error) {
    console.error(error);
    const err = new CustomError("Something went wrong!", 500);
    next(err);
  }
};

const signup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Step 1: Validate Request Data
    validationResult(req);

    // Step 2: Extract Data from Request
    const { email, password } = req.body;

    // Step 3: Check if User Exists with Customer Email
    const user = await findUserByEmail(email);

    if (!user) {
      throw new CustomError(
        "You are not registered. Please contact support.",
        400
      );
    }

    // Step 4: Encrypt Password
    const hashedPassword = await hashPassword(password);

    // Step 5: Update User Record with Encrypted Password
    await updateUserPassword(user.id, hashedPassword);

    // Step 6: Generate JWT Token
    const token = generateToken({
      email: user.email,
      id: user.id,
      role: "user", // Adjust role as necessary
    });

    res.cookie("token", token, {
      httpOnly: true,
    });

    // Step 7: Send Response
    res.status(200).json(
      ApiResponse.success({
        message: "Signup successful.",
        token,
        user: {
          id: user.id,
          email: user.email,
        },
      })
    );
  } catch (error) {
    console.error("Error during signup:", error);

    if (error instanceof CustomError) {
      return res
        .status(error.statusCode)
        .json(ApiResponse.error(error.message));
    }

    return res.status(500).json(ApiResponse.error("Internal server error"));
  }
};

export { logout, login, signup };
