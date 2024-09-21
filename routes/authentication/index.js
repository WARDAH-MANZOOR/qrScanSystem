import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../../prisma/client.js";
const router = Router();
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
router.get("/logout", async (req, res) => {
    res.cookie("token", "", {
        httpOnly: true,
        expires: new Date(0)
    });
    res.status(200).send({ message: "Logged out Successfully" });
});
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
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        // Fetch user by email
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                groups: {
                    include: {
                        group: true, // Fetch group details
                    },
                },
            },
        });
        if (!user) {
            return res.status(401).send("Invalid email or password");
        }
        // Compare passwords
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).send("Invalid email or password");
        }
        // Extract the group name (role) from the user's groups
        const userGroup = user.groups[0]; // Assuming one group per user for simplicity
        const role = userGroup ? userGroup.group.name : "user"; // Default role if no group found
        // Generate JWT token
        const token = jwt.sign({ email: user.email, role }, "shhhhhhhhhhhhhh", { expiresIn: "1h" });
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
