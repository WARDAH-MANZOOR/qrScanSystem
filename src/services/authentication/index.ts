import prisma from "prisma/client.js";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { Response } from "express";
import { body } from "express-validator";
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
export {getUserByEmail, comparePasswords, generateToken, setTokenCookie, validateLoginData}