import { Router } from "express";
import prisma from "../../prisma/client.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { isLoggedIn } from "../../utils/middleware.js";
import CustomError from "../../utils/custom_error.js";
const router = Router();
router.post("/create-user", async (req, res) => {
    const { username, email, password, group, commission, commissionGST, commissionWithHoldingTax, disbursementRate, disbursementGST, disbursementWithHoldingTax, settlementDuration } = req.body;
    let error;
    try {
        if (!email || typeof email !== 'string' || !email.includes('@')) {
            error = new CustomError("Invalid input data. 'email' must be a valid email address.", 400);
            res.status(400).json(error);
            return;
        }
        if (!password || typeof password !== 'string' || password.length < 6) {
            error = new CustomError("Invalid input data. 'password' must be at least 6 characters long.", 400);
            res.status(400).json(error);
            return;
        }
        // Check if the email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            error = new CustomError("Email already in use. Please choose another one.", 400);
            res.status(400).json(error);
            return;
        }
        bcrypt.genSalt(10, (err, salt) => {
            if (err) {
                error = new CustomError("An error occurred while generating the salt", 500);
                res.status(500).json(error);
                return;
            }
            bcrypt.hash(password, salt, async (err, hash) => {
                if (err) {
                    error = new CustomError("An error occurred while hashing the password", 500);
                    res.status(500).json(error);
                    return;
                }
                try {
                    console.log(hash);
                    if (group !== 1 && group !== 2 && !req.user?.merchant_id) {
                        error = new CustomError("Merchant ID is required if the group ID is not 1 or 2.", 400);
                        res.status(400).json(error);
                        return;
                    }
                    console.log("Role:", req.user?.role);
                    if ((group == 1 || group == 2) && req.user?.role != "Admin") {
                        error = new CustomError("Forbidden", 403);
                        res.status(403).json(error);
                        return;
                    }
                    if (group == 2 && (!commission || isNaN(parseFloat(commission)))) {
                        error = new CustomError("Commission not given", 400);
                        res.status(400).json(error);
                        return;
                    }
                    // Create the user
                    const user = await prisma.user.create({
                        data: {
                            username,
                            email,
                            password: hash,
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
                                // commission: commission          
                            }
                        });
                        await prisma.merchantFinancialTerms.create({
                            data: {
                                commissionRate: commission,
                                commissionGST: commissionGST ?? 0,
                                commissionWithHoldingTax: commissionWithHoldingTax ?? 0,
                                disbursementGST: disbursementGST ?? 0,
                                disbursementRate: disbursementRate ?? 0,
                                disbursementWithHoldingTax: disbursementWithHoldingTax ?? 0,
                                settlementDuration: settlementDuration ?? 2,
                                merchant_id: user.id
                            }
                        });
                    }
                    ;
                    // Check group and assign user to the correct group
                    // if (group === 1 || group === 2) {
                    await prisma.userGroup.create({
                        data: {
                            userId: user.id,
                            groupId: group,
                            merchantId: req.user?.merchant_id // Group ID 1 or 2
                        }
                    });
                    // }
                    // Generate token and respond
                    let token = jwt.sign({ email, id: user.id, merchant_id: group == 2 ? user.id : null, role: group == 1 ? "Admin" : group == 2 ? "Merchant" : "User", }, "shhhhhhhhhhhhhh");
                    res.cookie("token", token, {
                        httpOnly: true
                    });
                    res.status(201).send({
                        message: "User created successfully.",
                        token: token,
                        role: group == 1 ? "Admin" : group == 2 ? "Merchant" : "User",
                        username: user.username,
                        email: user.email,
                        id: user.id,
                        merchantId: group == 2 ? user.id : null
                    });
                }
                catch (err) {
                    console.log(err);
                    error = new CustomError("An error occurred while creating the user.", 500);
                    res.status(500).send(error);
                }
            });
        });
    }
    catch (err) {
        error = new CustomError("An error occurred. Please try again", 500);
        res.status(500).send(error);
    }
});
// Create a new group
router.post('/create-group', isLoggedIn, 
// authorize("Create user group"), 
async (req, res) => {
    const { name, permissions } = req.body;
    let error;
    try {
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            error = new CustomError("Invalid input data. 'name' must be a non-empty string.", 400);
            res.status(400).json(error);
            return;
        }
        if (!permissions || !Array.isArray(permissions) || permissions.some((id) => typeof id !== 'number')) {
            error = new CustomError("Invalid input data. 'permissions' must be an array of permission IDs (numbers).", 400);
            res.status(400).json(error);
            return;
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
            res.status(400).json(error);
            return;
        }
        const group = await prisma.group.create({
            data: {
                name,
                permissions: {
                    create: permissions.map((permissionId) => ({ permissionId })),
                },
            },
        });
        res.json(group);
    }
    catch (err) {
        error = new CustomError("Something went wrong, please try again later.", 500);
        res.status(500).json(error);
    }
});
// Create a new permission
router.post('/create-permission', isLoggedIn, async (req, res) => {
    const { name } = req.body;
    let error;
    try {
        // Validate input
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            error = new CustomError("Invalid input data. 'name' must be a non-empty string.", 400);
            res.status(400).json(error);
            return;
        }
        const permission = await prisma.permission.create({
            data: { name },
        });
        res.json(permission);
    }
    catch (err) {
        error = new CustomError("Something went wrong, please try again later.", 500);
        res.status(500).json(error);
    }
});
router.post("/assign", isLoggedIn, 
// authorize("Update user group"), 
async (req, res) => {
    const { userId, groupId } = req.body;
    try {
        let error;
        // Validate input
        if (!userId || !groupId || !Number.isInteger(userId) || !Number.isInteger(groupId)) {
            error = new CustomError("Invalid userId or groupId", 400);
            res.status(400).json(error);
            return;
        }
        // Check if user exists
        const userExists = await prisma.user.findUnique({
            where: { id: userId },
        });
        if (!userExists) {
            error = new CustomError("User not found", 404);
            res.status(404).json(error);
            return;
        }
        // Check if group exists
        const groupExists = await prisma.group.findUnique({
            where: { id: groupId },
        });
        if (!groupExists) {
            error = new CustomError("Group Not Found", 404);
            res.status(404).json(error);
            return;
        }
        console.log(req.user?.merchant_id);
        // Logic to assign user to group
        const user = await prisma.userGroup.create({
            data: {
                userId,
                groupId,
                merchantId: req.user?.merchant_id
            }
        });
        res.status(200).json({
            message: "User successfully assigned to group",
            userId,
            groupId
        });
    }
    catch (error) {
        console.log(error);
        error = new CustomError("Something went wrong, please try again later", 500);
        res.status(500).json(error);
    }
});
export default router;
