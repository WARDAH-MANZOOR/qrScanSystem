import { Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { JwtPayload } from "jsonwebtoken";
import prisma from "prisma/client.js";
import { createTransaction } from "services/transactions/create.js";
import ApiResponse from "utils/ApiResponse.js";
import CustomError from "utils/custom_error.js";

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
    body('order_id')
        .isString()
        .withMessage("Order Id must be a string")
];

export const createTransactionRequest = async (req: Request, res: Response) => {
    const { id, original_amount, type, customerName, customerEmail,order_id } = req.body;

    // Validate data
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
        return res.status(400).json(ApiResponse.error(validationErrors.array()[0] as unknown as string));
    }
    let merchant_id = (req.user as JwtPayload)?.id;
    
    if (!merchant_id) {
        return res.status(401).json(ApiResponse.error("Unauthorized"));
    }
    let data:{order_id?:string} = {};
    if(order_id) {
        data["order_id"] = order_id;
    }
    else {
        // data["order"]
    }
    try {
        // Create a new transaction request in the database
        const result = await createTransaction({
            ...data,
            id,
            date_time: new Date(),
            original_amount,
            status: "pending", // Initially, the transaction is pending
            type,
            merchant_id,
            customerName,
            customerEmail
        });
        // Send the response with the created transaction
        return res.status(201).json(ApiResponse.success(result));
    } catch (error) {
        console.error('Error creating transaction request:', error);

        if (error instanceof CustomError) {
            return res.status(error.statusCode).json(ApiResponse.error(error.message));
        }

        return res.status(500).json(ApiResponse.error("Internal Server Error"));
    }
};