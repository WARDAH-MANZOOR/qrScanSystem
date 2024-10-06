import { Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { JwtPayload } from "jsonwebtoken";
import prisma from "prisma/client.js";
import ApiResponse from "utils/ApiResponse.js";

export const validateTransaction = [
    // Validate 'id' field
    body('id')
        .notEmpty()
        .withMessage('ID is required')
        .isString()
        .withMessage('ID must be a string')
        .matches(/^T\d{8}$/)
        .withMessage('ID must start with "T" followed by 8 digits'),

    // Validate 'original_amount' field
    body('original_amount')
        .notEmpty()
        .withMessage('Original amount is required')
        .isFloat({ gt: 0 })
        .withMessage('Original amount must be a positive number'),

    // Validate 'type' field
    body('type')
        .notEmpty()
        .withMessage('Type is required')
        .isIn(['wallet', 'card', 'bank'])
        .withMessage('Type must be one of PURCHASE, REFUND, or CHARGEBACK'),

    // Validate 'customerName' field
    body('customerName')
        .notEmpty()
        .withMessage('Customer name is required')
        .isString()
        .withMessage('Customer name must be a string')
        .isLength({ max: 100 })
        .withMessage('Customer name must not exceed 100 characters'),

    // Validate 'customerEmail' field
    body('customerEmail')
        .notEmpty()
        .withMessage('Customer email is required')
        .isEmail()
        .withMessage('Customer email must be a valid email address')
        .normalizeEmail(),
];

export const createTransactionRequest = async (req: Request, res: Response) => {
    const { id, original_amount, type, customerName, customerEmail } = req.body;

    // Validate data
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
        return res.status(400).json(ApiResponse.error(validationErrors.array()[0] as unknown as string));
    }
    let merchant_id = (req.user as JwtPayload)?.id;
    let commission = await prisma.merchant.findUnique({
        where: { merchant_id },
    })
    try {
        // Create a new transaction request in the database
        const transaction = await prisma.transaction.create({
            data: {
                transaction_id: id,
                date_time: new Date(),
                original_amount: parseFloat(original_amount),
                status: "pending", // Initially, the transaction is pending
                type: type,
                merchant: {
                    connect: { id: merchant_id },
                },
                settled_amount: parseFloat(original_amount) * (1 - (commission?.commission as unknown as number))
            }
        });

        // Send the response with the created transaction
        return res.status(201).json({
            message: "Transaction request created successfully",
            transaction,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};