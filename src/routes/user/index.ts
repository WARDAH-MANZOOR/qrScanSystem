import { Request, Response, Router } from "express";
import prisma from "../../prisma/client.js";
import bcrypt from "bcrypt";
import jwt, { JwtPayload } from "jsonwebtoken";
import { authorize, isLoggedIn } from "../../utils/middleware.js";
import CustomError from "../../utils/custom_error.js";

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
 *     Merchant:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           description: The email address of the user.
 *           example: johndoe@example.com
 *         password:
 *           type: string
 *           description: The hashed password of the user.
 *           example: Password123!
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

router.post("/create-user", isLoggedIn, authorize("Create portal user"), async (req: Request, res: Response) => {
    const { username, email, password, age, merchant } = req.body;
    let error;
    try {
        // Validate input data
        if (!username || typeof username !== 'string' || username.trim().length === 0) {
            error = new CustomError("Invalid input data. 'username' must be a non-empty string.", 400);
            return res.status(400).json(error);
        }

        if (!email || typeof email !== 'string' || !email.includes('@')) {
            error = new CustomError("Invalid input data. 'email' must be a valid email address.", 400);
            return res.status(400).json(error);
        }

        if (!password || typeof password !== 'string' || password.length < 6) {
            error = new CustomError("Invalid input data. 'password' must be at least 6 characters long.", 400);
            return res.status(400).json(error);
        }

        if (age && typeof age !== 'number') {
            error = new CustomError("Invalid input data. 'age' must be a number.", 400);
            return res.status(400).json(error);
        }

        // Check if the email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            error = new CustomError("Email already in use. Please choose another one.", 400);
            return res.status(400).json(error);
        }
        bcrypt.genSalt(10, (err, salt) => {
            if (err) {
                error = new CustomError("An error occurred while generating the salt", 500);
                return res.status(500).json(error);

            }
            bcrypt.hash(password, salt, async (err, hash) => {
                if (err) {
                    error = new CustomError("An error occurred while hashing the password", 500);
                    return res.status(500).json(error);
                }
                try {
                    const user = await prisma.user.create({
                        data: {
                            username,
                            email,
                            password: hash,
                            age,
                            merchant_id: (req.user as JwtPayload)?.merchant_id
                        }
                    });
                    let token = jwt.sign({ email, id: user.id }, "shhhhhhhhhhhhhh");
                    res.cookie("token", token, {
                        httpOnly: true
                    });
                    res.status(201).send(user);
                }
                catch (err) {
                    error = new CustomError("An error occurred while creating the user.", 500);
                    res.status(500).send(error);
                }
            })
        })
    }
    catch (err) {
        error = new CustomError("An error occurred. Please try again", 500);
        res.status(500).send(error);
    }

})

/**
 * @swagger
 * /user_api/create-merchant:
 *   post:
 *     summary: Create a new merchant
 *     tags: 
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Merchant'
 *     responses:
 *       200:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Merchant'
 */
router.post("/create-merchant", async (req: Request, res: Response) => {
    const { email, password } = req.body;
    let error;
    try {
        // Validate input data

        if (!email || typeof email !== 'string' || !email.includes('@')) {
            error = new CustomError("Invalid input data. 'email' must be a valid email address.", 400);
            return res.status(400).json(error);
        }

        if (!password || typeof password !== 'string' || password.length < 6) {
            error = new CustomError("Invalid input data. 'password' must be at least 6 characters long.", 400);
            return res.status(400).json(error);
        }

        // Check if the email already exists
        const existingUser = await prisma.merchant.findMany({
            where: { email },
        });

        if (existingUser.length > 0) {
            error = new CustomError("Email already in use. Please choose another one.", 400);
            return res.status(400).json(error);
        }
        bcrypt.genSalt(10, (err, salt) => {
            if (err) {
                error = new CustomError("An error occurred while generating the salt", 500);
                return res.status(500).json(error);

            }
            bcrypt.hash(password, salt, async (err, hash) => {
                if (err) {
                    error = new CustomError("An error occurred while hashing the password", 500);
                    return res.status(500).json(error);
                }
                try {
                    const user = await prisma.merchant.create({
                        data: {
                            email,
                            password: hash,
                            company_name: "",
                            city: "",
                            full_name: "",
                            phone_number: ""
                        }
                    });
                    let token = jwt.sign({ email, id: user.merchant_id }, "shhhhhhhhhhhhhh");
                    await prisma.userGroup.create({
                        data: {
                            userId: user.merchant_id,
                            groupId: 2,
                            merchantId: user.merchant_id
                        }
                    })
                    res.cookie("token", token, {
                        httpOnly: true
                    });
                    res.status(201).send(user);
                }
                catch (err) {
                    error = new CustomError("An error occurred while creating the user.", 500);
                    res.status(500).send(error);
                }
            })
        })
    }
    catch (err) {
        error = new CustomError("An error occurred. Please try again", 500);
        res.status(500).send(error);
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
router.post('/create-group', isLoggedIn, 
    // authorize("Create user group"), 
    async (req: Request, res: Response) => {
    const { name, permissions } = req.body;
    let error;
    try {
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            error = new CustomError("Invalid input data. 'name' must be a non-empty string.", 400);
            return res.status(400).json(error);
        }

        if (!permissions || !Array.isArray(permissions) || permissions.some((id: any) => typeof id !== 'number')) {
            error = new CustomError("Invalid input data. 'permissions' must be an array of permission IDs (numbers).", 400);
            return res.status(400).json(error);
        }

        // Check if all permission IDs exist in the Permission table
        const existingPermissions = await prisma.permission.findMany({
            where: {
                id: {
                    in: permissions, // Find all permissions that match the provided IDs
                },
            },
        });

        if (existingPermissions.length !== permissions.length) {
            error = new CustomError("One or more permissions provided do not exist.", 400);
            return res.status(400).json(error);
        }

        const group = await prisma.group.create({
            data: {
                name,
                permissions: {
                    create: permissions.map((permissionId: number) => ({ permissionId })),
                },
            },
        });
        res.json(group);
    }
    catch (err) {
        error = new CustomError("Something went wrong, please try again later.", 500);
        return res.status(500).json(error);
    }
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
router.post('/create-permission', isLoggedIn, async (req: Request, res: Response) => {
    const { name } = req.body;
    let error;
    try {
        // Validate input
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            error = new CustomError("Invalid input data. 'name' must be a non-empty string.", 400);
            return res.status(400).json(error);
        }
        const permission = await prisma.permission.create({
            data: { name },
        });
        res.json(permission);
    }
    catch (err) {
        error = new CustomError("Something went wrong, please try again later.", 500);
        return res.status(500).json(error);
    }
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
router.post("/assign", isLoggedIn, 
    // authorize("Update user group"), 
    async (req: Request, res: Response) => {
    const { userId, groupId } = req.body;

    try {
        let error;
        // Validate input
        if (!userId || !groupId || !Number.isInteger(userId) || !Number.isInteger(groupId)) {
            error = new CustomError("Invalid userId or groupId", 400);
            return res.status(400).json(error);
        }

        // Check if user exists
        const userExists = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!userExists) {
            error = new CustomError("User not found", 404);
            return res.status(404).json(error);
        }

        // Check if group exists
        const groupExists = await prisma.group.findUnique({
            where: { id: groupId },
        });

        if (!groupExists) {
            error = new CustomError("Group Not Found", 404);
            return res.status(404).json(error);
        }

        console.log((req.user as JwtPayload)?.merchant_id)
        // Logic to assign user to group
        const user = await prisma.userGroup.create({
            data: {
                userId,
                groupId,
                merchantId: (req.user as JwtPayload)?.merchant_id
            }
        });

        res.status(200).json({
            message: "User successfully assigned to group",
            userId,
            groupId
        });
    } catch (error) {
        console.log(error)
        error = new CustomError("Something went wrong, please try again later", 500);
        res.status(500).json(error);
    }
});

export default router;