import { Request, Response, Router } from "express";
import prisma from "../../prisma/client.js";
import { JwtPayload } from "jsonwebtoken";
import { isLoggedIn } from "utils/middleware.js";
import { Decimal } from "@prisma/client/runtime/library";

interface TransactionRequest {
  id: string;
  date_time: string;
  original_amount: string;
  type: string;
}

const router = Router();
// Utility function for validation
const isValidTransactionRequest = (data: TransactionRequest) => {
  const errors = [];

  // Validate date_time
  if (!data.id || !data.id.startsWith("T")) {
    errors.push({ msg: "Invalid Transaction Id", param: "id" });
  }

  // Validate original_amount
  if (
    !data.original_amount ||
    isNaN(parseFloat(data.original_amount)) ||
    parseFloat(data.original_amount) <= 0
  ) {
    errors.push({
      msg: "Original amount must be a positive number",
      param: "original_amount",
    });
  }

  // Validate type
  const validTypes = ["wallet", "card", "bank"];
  if (!data.type || !validTypes.includes(data.type)) {
    errors.push({ msg: "Invalid transaction type", param: "type" });
  }

  return errors;
};

export const createTransactionRequestFromLib = async (obj: any) => {
  const { id, original_amount, type } = obj;

  // Validate data
  const validationErrors = isValidTransactionRequest(obj);
  if (validationErrors.length > 0) {
    return { errors: validationErrors, success: false };
  }
  let merchant_id = (obj.user as JwtPayload)?.id;
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
        settled_amount: parseFloat(original_amount),
      },
    });

    // Send the response with the created transaction

    return {
      message: "Transaction request created successfully",
      success: true,
      transaction,
    };
  } catch (error) {
    return { message: "Internal server error", success: false };
  }
};

// Transaction Request Creation API
export const createTransactionRequest = async (req: Request, res: Response) => {
  const { id, original_amount, type } = req.body;

  // Validate data
  const validationErrors = isValidTransactionRequest(req.body);
  if (validationErrors.length > 0) {
    return res.status(400).json({ errors: validationErrors });
  }
  let merchant_id = (req.user as JwtPayload)?.id;
  let commission = await prisma.merchant.findUnique({
    where: {merchant_id},
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

/**
 * @swagger
 * components:
 *   schemas:
 *     TransactionRequest:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: T*
 *           description: Transaction id starting with T and then whole date time in integers
 *           example: T20240928
 *         original_amount:
 *           type: number
 *           format: float
 *           description: The original amount of the transaction.
 *           example: 100.00
 *         type:
 *           type: string
 *           enum: [purchase, refund, chargeback]
 *           description: The type of transaction.
 *           example: "purchase"
 *     TransactionResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "Transaction request created successfully"
 *         transaction:
 *           type: object
 *           properties:
 *             transaction_id:
 *               type: integer
 *               description: The unique ID of the transaction.
 *               example: 1
 *             date_time:
 *               type: string
 *               format: date-time
 *               description: The date and time of the transaction.
 *               example: "2024-09-26T23:42:00Z"
 *             original_amount:
 *               type: number
 *               format: float
 *               description: The original amount of the transaction.
 *               example: 100.00
 *             merchant_id:
 *               type: integer
 *               description: The ID of the merchant.
 *               example: 2
 *             status:
 *               type: string
 *               description: The status of the transaction.
 *               example: "pending"
 *             type:
 *               type: string
 *               description: The type of transaction.
 *               example: "purchase"
 *
 * /transaction_create/:
 *   post:
 *     summary: Create a transaction request
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TransactionRequest'
 *     responses:
 *       201:
 *         description: Transaction request created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TransactionResponse'
 *       400:
 *         description: Bad request due to validation errors.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       msg:
 *                         type: string
 *                         description: The error message.
 *                         example: "Invalid date format"
 *                       param:
 *                         type: string
 *                         description: The parameter that caused the validation error.
 *                         example: "date_time"
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 */

router.post("/", isLoggedIn, createTransactionRequest);
export default router;
