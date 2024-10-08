import prisma from "prisma/client.js";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { Response } from "express";
import { body } from "express-validator";
import CustomError from "utils/custom_error.js";
const getUserByEmail = async (email: string) => {
    return prisma.user.findUnique({
        where: { email },
        include: {
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
    return jwt.sign(payload, process.env.JWT_SECRET || "default_secret", { expiresIn: "1h" });
};

const setTokenCookie = (res: Response, token: string) => {
    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // Secure cookie in production
        sameSite: "strict", // Better security
    });
};

const validateLoginData = [
    body('email').isEmail().withMessage('A valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
];

const validateSignup = [
    body('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email address')
        .normalizeEmail(),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
];

async function findUserByEmail(email: string) {
    const user = await prisma.user.findUnique({
        where: { email },
    });
    return user;
}

async function hashPassword(password: string): Promise<string> {
    let salt = await bcrypt.genSalt(10);
    if(!salt) {
        throw new CustomError("An error occured while creating the salt",500);
    }
    let hash = await bcrypt.hash(password,salt);
    return hash;
}

async function updateUserPassword(userId: number, hashedPassword: string) {
    await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
    });
}

export { getUserByEmail, comparePasswords, generateToken, setTokenCookie, validateLoginData, validateSignup, findUserByEmail, hashPassword, updateUserPassword }