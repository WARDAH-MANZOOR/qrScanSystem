import { NextFunction, Request, Response } from "express";
import prisma from "prisma/client.js";
import CustomError from "utils/custom_error.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { validationResult } from "express-validator";
import { comparePasswords, generateToken, getUserByEmail, setTokenCookie } from "services/authentication/index.js";
import ApiResponse from "utils/ApiResponse.js";

const logout = async (req: Request, res: Response) => {
    res.cookie("token", "", {
        httpOnly: true,
        expires: new Date(0)
    });
    res.status(200).send({ message: "Logged out Successfully" })
}

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
            next(error);
        }

        // Compare passwords
        const isPasswordValid = await comparePasswords(password, user?.password as string);
        if (!isPasswordValid) {
            const error = new CustomError("Invalid email or password", 401);
            next(error)
        }

        // Extract the group name (role) from the user's groups
        const userGroup = user?.groups[0]; // Assuming one group per user
        const role = userGroup ? userGroup.group.name : "user"; // Default role if no group found

        // Generate JWT token
        const token = generateToken({
            email: user?.email,
            role,
            id: user?.id,
            merchant_id: user?.merchant_id,
        });

        // Set token in cookies
        setTokenCookie(res, token);

        // Return user details
        return res.status(200).json(ApiResponse.success({
            message: "Login successful.",
            token: token,
            role: role,
            username: user?.username,
            email: user?.email,
            id: user?.id,
            merchantId: user?.merchant_id,
        }));
    } catch (error) {
        console.error(error);
        const err = new CustomError("Something went wrong!", 500);
        next(err);
    }
};

export {logout, login}