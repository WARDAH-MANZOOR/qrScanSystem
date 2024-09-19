import { Router } from "express";
import prisma from "../../prisma/client.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
const router = Router();
/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - password
 *         - age
 *       properties:
 *         id:
 *           type: integer
 *           description: The unique identifier of the user.
 *           example: 1
 *         username:
 *           type: string
 *           description: The username of the user.
 *           example: john_doe
 *         email:
 *           type: string
 *           description: The email address of the user.
 *           example: johndoe@example.com
 *         password:
 *           type: string
 *           description: The hashed password of the user.
 *           example: Password123!
 *         age:
 *           type: integer
 *           description: The age of the user.
 *           example: 25
 *         role:
 *           type: string
 *           description: role being assigned to user
 *           example: user
 */
/**
 * @swagger
 * /user_api/create:
 *   post:
 *     summary: Create a new user
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       200:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.post("/create", (req, res) => {
    const { username, email, password, age, role } = req.body;
    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            const user = await prisma.user.create({
                data: {
                    username,
                    email,
                    password: hash,
                    age,
                    role
                }
            });
            let token = jwt.sign({ email }, "shhhhhhhhhhhhhh");
            res.cookie("token", token, {
                httpOnly: true
            });
            res.send(user);
        });
    });
});
/**
 * @swagger
 * /user_api/logout:
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
router.get("/logout", async (req, res) => {
    res.cookie("token", "", {
        httpOnly: true,
        expires: new Date(0)
    });
    res.status(200).send({ message: "Logged out Successfully" });
});
/**
 * @swagger
 * /user_api/login:
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
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        // Fetch user by email
        const user = await prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            return res.status(401).send("Invalid email or password");
        }
        // Compare passwords
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).send("Invalid email or password");
        }
        // Generate JWT token
        const token = jwt.sign({ email: user.email }, "shhhhhhhhhhhhhh", { expiresIn: "1h" });
        // Set token in cookies
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production", // Secure cookie in production
            sameSite: "strict", // Better security
        });
        return res.status(200).send("Yes! You can login");
    }
    catch (error) {
        console.error(error);
        return res.status(500).send("Something went wrong!");
    }
});
export default router;
