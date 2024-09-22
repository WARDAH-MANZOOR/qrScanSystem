import { Router } from "express";
import prisma from "../../prisma/client.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { authorize, isLoggedIn } from "../../utils/middleware.js";
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
 *     AssignUserToGroup:
 *       type: object
 *       required:
 *         - userId
 *         - groupId
 *       properties:
 *         userId:
 *           type: integer
 *           example: 1
 *           description: ID of the user to be assigned
 *         groupId:
 *           type: integer
 *           example: 2
 *           description: ID of the group to which the user will be assigned
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
router.post("/create-user", isLoggedIn, authorize("Create portal user"), (req, res) => {
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
                let token = jwt.sign({ email, id: user.id }, "shhhhhhhhhhhhhh");
                res.cookie("token", token, {
                    httpOnly: true
                });
                res.status(201).send(user);
            });
        });
    }
    catch (err) {
        res.status(500).send("An error occurred while creating the user.");
    }
});
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
router.post('/create-group', isLoggedIn, authorize("Create user group"), async (req, res) => {
    const { name, permissions } = req.body;
    const group = await prisma.group.create({
        data: {
            name,
            permissions: {
                create: permissions.map((permissionId) => ({ permissionId })),
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
router.post('/create-permission', isLoggedIn, async (req, res) => {
    const { name } = req.body;
    const permission = await prisma.permission.create({
        data: { name },
    });
    res.json(permission);
});
/**
 * @swagger
 * /user_api/assign:
 *   post:
 *     summary: Assign a user to a group
 *     description: Assigns a user to a specific group, allowing them to inherit the group's permissions.
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssignUserToGroup'
 *     responses:
 *       200:
 *         description: User successfully assigned to the group
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AssignUserToGroup'
 *       400:
 *         description: Bad Request - Invalid data or missing fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid userId or groupId"
 *       404:
 *         description: User or Group not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "User or Group not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Something went wrong, please try again later"
 */
router.post("/assign", isLoggedIn, authorize("Update user group"), async (req, res) => {
    const { userId, groupId } = req.body;
    try {
        // Logic to assign user to group
        const user = await prisma.userGroup.create({
            data: {
                userId,
                groupId
            }
        });
        res.status(200).json({
            message: "User successfully assigned to group",
            userId,
            groupId
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Something went wrong, please try again later"
        });
    }
});
export default router;
