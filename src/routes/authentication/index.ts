import { Request, Response, Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"
import prisma from "../../prisma/client.js";
import CustomError from "../../utils/custom_error.js";
import { login, logout } from "controller/authentication/index.js";
import { validateLoginData } from "services/authentication/index.js";

const router = Router();

router.get("/logout", logout)
router.post("/login", validateLoginData, login);

export default router;

/**
 * @swagger
 * /auth_api/login:
 *   post:
 *     summary: User login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *           example:
 *             email: johndoe@example.com
 *             password: password123
 *     responses:
 *       200:
 *         description: Login success
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               example: "Yes! You can login"
 *       401:
 *         description: Unauthorized - Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               example: "Invalid email or password"
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /auth_api/logout:
 *   get:
 *     summary: Logs out the user by clearing the authentication token.
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: User logged out successfully. The authentication token is cleared.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Logged out Successfully"
 */