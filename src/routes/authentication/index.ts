import { Request, Response, Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"
import prisma from "../../prisma/client.js";
import CustomError from "../../utils/custom_error.js";

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
router.get("/logout", async (req: Request, res: Response) => {
    res.cookie("token", "", {
        httpOnly: true,
        expires: new Date(0)
    });
    res.status(200).send({ message: "Logged out Successfully" })
})


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
router.post("/login", async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        console.log("User", req.user);
        // Fetch user by email
        const user = await prisma.user.findUnique({
            where: { email,  },
            include: {
                groups: {
                    include: {
                        group: true, // Fetch group details
                    },
                },
            },
        });

        if (!user) {
            const error = new CustomError("Invalid email or password",401);
            return res.status(401).send(error);
        }
        console.log("User: ",user);
        // Compare passwords
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            const error = new CustomError("Invalid email or password",401);
            return res.status(401).send(error);
        }
        
        // Extract the group name (role) from the user's groups
        const userGroup = user.groups[0]; // Assuming one group per user for simplicity
        const role = userGroup ? userGroup.group.name : "user"; // Default role if no group found
        
        // Generate JWT token
        const token = jwt.sign({ email: user.email, role, id:user.id, merchant_id: user.merchant_id }, "shhhhhhhhhhhhhh", { expiresIn: "1h" });

        // Set token in cookies
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production", // Secure cookie in production
            sameSite: "strict", // Better security
        });
        //all user details, merchantId
        return res.status(200).send({
            message: "Login successfull.",
            token: token,
            role: role,
            username: user.username,
            email: user.email,
            id: user.id,
            merchantId: user.merchant_id
        }); 
    } catch (error) {
        error = new CustomError("Something went wrong!",500);
        return res.status(500).send("Something went wrong!");
    }
});

export default router;