import { Request, Response, Router } from "express";
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

router.post("/create", (req: Request, res: Response) => {
    const { username, email, password, age } = req.body;

    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            const user = await prisma.user.create({
                data: {
                    username,
                    email,
                    password: hash,
                    age
                }
            });
            let token = jwt.sign({email},"shhhhhhhhhhhhhh");
            res.cookie("token",token);
            res.send(user);
        })
    })

})

export default router;