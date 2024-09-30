import { Request, Response, Router } from "express";
import prisma from "../../prisma/client.js";
import bcrypt from "bcrypt";
import jwt, { JwtPayload } from "jsonwebtoken";
import { authorize, isLoggedIn } from "../../utils/middleware.js";
import CustomError from "../../utils/custom_error.js";
import updateMerchant from "controller/Marchant information update/index.js";

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
 *         group:
 *           type: number
 *           description: Group id 1 for admin 2 for merchant
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

router.post("/create-user", isLoggedIn,
    authorize("Create portal user"),
    async (req: Request, res: Response) => {
        const { username, email, password, group, commission } = req.body;
        let error;
        try {
            if (!email || typeof email !== 'string' || !email.includes('@')) {
                error = new CustomError("Invalid input data. 'email' must be a valid email address.", 400);
                return res.status(400).json(error);
            }

            if (!password || typeof password !== 'string' || password.length < 6) {
                error = new CustomError("Invalid input data. 'password' must be at least 6 characters long.", 400);
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
                        console.log(hash)
                        if (group !== 1 && group !== 2 && !(req.user as JwtPayload)?.merchant_id) {
                            error = new CustomError("Merchant ID is required if the group ID is not 1 or 2.", 400);
                            return res.status(400).json(error);
                        }
                        console.log("Role:",(req.user as JwtPayload)?.role);
                        if ((group == 1 || group == 2) && (req.user as JwtPayload)?.role != "Admin") {
                            error = new CustomError("Forbidden" ,403);
                            return res.status(403).json(error);
                        }

                        if (group == 2 && (!commission || isNaN(parseFloat(commission)))) {
                            error = new CustomError("Commission not given" ,400);
                            return res.status(400).json(error);
                        }
                        // Create the user
                        const user = await prisma.user.create({
                            data: {
                                username,
                                email,
                                password: hash,
                                merchant_id: undefined
                            }
                        });

                        if (group == 2) {
                            await prisma.merchant.create({
                                data: {
                                    merchant_id: user.id,
                                    full_name: "",
                                    phone_number: "",
                                    company_name: "",
                                    city: "",
                                    user_id: user.id,
                                    commission: commission          
                                }
                            })
                            await prisma.user.update({
                                where: { id: user.id },
                                data: {
                                    merchant_id: user.id
                                }
                            })
                        };

                        // Check group and assign user to the correct group
                        if (group === 1 || group === 2) {
                            await prisma.userGroup.create({
                                data: {
                                    userId: user.id,
                                    groupId: group,
                                    merchantId: (req.user as JwtPayload)?.merchant_id // Group ID 1 or 2
                                }
                            });
                        }

                        // Generate token and respond
                        let token = jwt.sign({ email, id: user.id, merchant_id: user.merchant_id, role: group == 1 ? "Admin": group == 2 ? "Merchant": "User", }, "shhhhhhhhhhhhhh");
                        res.cookie("token", token, {
                            httpOnly: true
                        });
                        res.status(201).send({
                            message: "User created successfully.",
                            token: token,
                            role: group == 1 ? "Admin": group == 2 ? "Merchant": "User",
                            username: user.username,
                            email: user.email,
                            id: user.id,
                            merchantId: user.merchant_id
                        });
                    } catch (err) {
                        console.log(err);
                        error = new CustomError("An error occurred while creating the user.", 500);
                        res.status(500).send(error);
                    }
                });
            });
        } catch (err) {
            error = new CustomError("An error occurred. Please try again", 500);
            res.status(500).send(error);
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


    /**
 * @swagger
 * /user_api/update-merchant/:
 *   put:
 *     summary: Update merchant details
 *     tags: [Merchant]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: The full name of the merchant
 *                 example: John Doe
 *               phone_number:
 *                 type: string
 *                 description: The phone number of the merchant
 *                 example: +1234567890
 *               company_name:
 *                 type: string
 *                 description: The name of the company
 *                 example: Acme Inc
 *               company_url:
 *                 type: string
 *                 description: The website of the company
 *                 example: https://acme.com
 *               city:
 *                 type: string
 *                 description: The city where the company is based
 *                 example: New York
 *               payment_volume:
 *                 type: number
 *                 description: Monthly payment volume
 *                 example: 50000
 *     responses:
 *       200:
 *         description: Merchant updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized - JWT token missing or invalid
 *       500:
 *         description: Internal server error
 */
router.put("/update-merchant",isLoggedIn,updateMerchant)
export default router;