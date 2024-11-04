import prisma from "prisma/client.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Response } from "express";
import { body } from "express-validator";
import CustomError from "utils/custom_error.js";
import { generateApiKey, hashApiKey } from "utils/authentication.js";

const getUserByEmail = async (email: string) => {
  return prisma.user.findUnique({
    where: { email },
    include: {
      // Include merchant Uid only
      // merchant: {
      //   select: {
      //     uid: true,
      //     full_name: true,
      //     phone_number: true,
      //     payment_volume: true,
      //     commissions: true,
      //   },
      // },
      groups: {
        include: {
          group: true, // Fetch group details
        },
      },
    },
  });
};

const comparePasswords = async (password: string, hashedPassword: string) => {
  return bcrypt.compare(password, hashedPassword);
};

const generateToken = (payload: any) => {
  return jwt.sign(payload, process.env.JWT_SECRET || "default_secret", {
    expiresIn: "1h",
  });
};

const setTokenCookie = (res: Response, token: string) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Secure cookie in production
    sameSite: "strict", // Better security
  });
};

const validateLoginData = [
  body("email").isEmail().withMessage("A valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

const validateSignup = [
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email address")
    .normalizeEmail(),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

async function findUserByEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  });
  return user;
}

async function hashPassword(password: string): Promise<string> {
  let salt = await bcrypt.genSalt(10);
  if (!salt) {
    throw new CustomError("An error occured while creating the salt", 500);
  }
  let hash = await bcrypt.hash(password, salt);
  return hash;
}

async function updateUserPassword(userId: number, hashedPassword: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });
}

const getAPIKey = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { apiKey: true },
  });
  return user?.apiKey;
};

const createAPIKey = async (userId: number) => {
  try {
    const createKey = generateApiKey();
    const hashedKey = hashApiKey(createKey);

    const result = await prisma.$transaction(async (transaction) => {
      const user = await transaction.user
        .update({
          where: { id: userId },
          data: { apiKey: hashedKey },
        })
        .catch((error) => {
          throw new CustomError(
            "An error occured while creating the API key",
            500
          );
        });
    });

    return {
      key: createKey,
      message:"API key created successfully",
    };
  } catch (error) {
    console.error("Transaction rolled back due to error:", error);
  }
};

export {
  getUserByEmail,
  comparePasswords,
  generateToken,
  setTokenCookie,
  validateLoginData,
  validateSignup,
  findUserByEmail,
  hashPassword,
  updateUserPassword,
  createAPIKey,
};

export default {
  getAPIKey,
  createAPIKey,
};
