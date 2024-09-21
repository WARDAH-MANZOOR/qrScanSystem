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
 *         groupId:
 *           type: integer
 *           description: group being assigned to user
 *           example: 1
 *     GroupCreateRequest:
 *       type: object
 *       required:
 *         - name
 *         - permissions
 *       properties:
 *         name:
 *           type: string
 *           description: The name of the group.
 *         permissions:
 *           type: array
 *           items:
 *             type: integer
 *           description: An array of permission IDs to be assigned to the group.
 *     PermissionCreateRequest:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           description: The name of the permission. 
 
*/

/**
 * @swagger
 * /user_api/create-user:
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

router.post("/create-user", (req: Request, res: Response) => {
    const { username, email, password, age, groupId } = req.body;

    try {
        bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(password, salt, async (err, hash) => {
                const user = await prisma.user.create({
                    data: {
                        username,
                        email,
                        password: hash,
                        age,
                        groups: {
                            create: {
                                group: {
                                    connect: { id: groupId }
                                }
                            }
                        }
                    }
                });
                let token = jwt.sign({ email }, "shhhhhhhhhhhhhh");
                res.cookie("token", token, {
                    httpOnly: true
                });
                res.status(201).send(user);
            })
        })
    }
    catch (err) {
        res.status(500).send("An error occurred while creating the user.");
    }

})

/**
 * @swagger
 * /user_api/create-group:
 *   post:
 *     summary: Create a new user group
 *     description: Creates a user group with specified permissions.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GroupCreateRequest'
 *     responses:
 *       200:
 *         description: The created user group.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GroupCreateRequest'
 *       400:
 *         description: Invalid input data.
 */

// Create a new group
router.post('/create-group', async (req: Request, res: Response) => {
    const { name, permissions } = req.body;
    const group = await prisma.group.create({
        data: {
            name,
            permissions: {
                create: permissions.map((permissionId: number) => ({ permissionId })),
            },
        },
    });
    res.json(group);
});

/**
 * @swagger
 * /user_api/create-permission:
 *   post:
 *     summary: Create a new permission
 *     description: Creates a new permission for user groups.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PermissionCreateRequest'
 *     responses:
 *       200:
 *         description: The created permission.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PermissionCreateRequest'
 *       400:
 *         description: Invalid input data.
 */
// Create a new permission
router.post('/create-permission', async (req: Request, res: Response) => {
    const { name } = req.body;
    const permission = await prisma.permission.create({
        data: { name },
    });
    res.json(permission);
});

router.post('/assign', async (req, res) => {
    const { userId, groupId } = req.body;
    const userGroup = await prisma.userGroup.create({
        data: {
            userId,
            groupId,
        },
    });
    res.json(userGroup);
});

export default router;