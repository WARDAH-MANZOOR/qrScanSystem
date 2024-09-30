import { getAllTransactions } from "@prisma/client/sql";
import {getTransactionOfMerchant, searchTransactions } from "controller/transaction/admin_only.js";
import { Request, Response, Router } from "express";
import prisma from "prisma/client.js";
import CustomError from "utils/custom_error.js";
import { isAdmin, isLoggedIn } from "utils/middleware.js";

let router = Router();

/**
 * @swagger
 * /admin_api/transactions/:
 *   get:
 *     summary: Retrieve all transactions with profit and merchant details
 *     description: Fetches all transactions from the database along with their original amount, settled amount, calculated profit (original_amount - settled_amount), and the associated merchant's name.
 *     tags:
 *       - [AdminOnly]
 *     responses:
 *       200:
 *         description: A list of transactions with calculated profit and merchant details.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   transaction_id:
 *                     type: string
 *                     description: The unique identifier for the transaction.
 *                     example: "abc1234"
 *                   original_amount:
 *                     type: number
 *                     format: decimal
 *                     description: The original transaction amount.
 *                     example: 100.00
 *                   settled_amount:
 *                     type: number
 *                     format: decimal
 *                     description: The settled amount after transaction completion.
 *                     example: 90.00
 *                   profit:
 *                     type: number
 *                     format: decimal
 *                     description: The profit calculated as the difference between original_amount and settled_amount.
 *                     example: 10.00
 *                   merchant_name:
 *                     type: string
 *                     description: The name of the merchant associated with the transaction.
 *                     example: "JohnDoe"
 *       500:
 *         description: Internal server error occurred while fetching transactions.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message
 *                   example: "An error occurred while fetching transactions."
 */

router.get("/transactions", isLoggedIn, isAdmin, async (req: Request, res: Response) => {
    try {
        const transactions = await prisma.$queryRawTyped(getAllTransactions());

        // Send the result directly
        res.status(200).json(transactions);
    } catch (error) {
        console.error(error);
        error = new CustomError("An error occurred while fetching transactions.",500);
        res.status(500).json(error);
    }
});

/**
 * @swagger
 * /admin_api/merchant-transactions/{merchantId}:
 *   get:
 *     summary: Get transactions for a specific merchant
 *     description: Retrieve all transactions related to the given merchant ID. If the merchant ID is invalid or not found, a 404 error is returned.
 *     tags:
 *       - [AdminOnly]
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         description: ID of the merchant
 *         schema:
 *           type: integer
 *           example: 123
 *     responses:
 *       200:
 *         description: Successful response with a list of transactions for the merchant
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   transaction_id:
 *                     type: integer
 *                     description: Unique identifier of the transaction
 *                   original_amount:
 *                     type: number
 *                     format: float
 *                     description: Original transaction amount
 *                   settled_amount:
 *                     type: number
 *                     format: float
 *                     description: Amount settled after deductions
 *                   profit:
 *                     type: number
 *                     format: float
 *                     description: Calculated profit (original_amount - settled_amount)
 *                   merchant_name:
 *                     type: string
 *                     description: Name of the merchant
 *       404:
 *         description: Merchant not found or invalid ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 *                   example: "Merchant Not Found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 *                   example: "Internal Server Error"
 */
router.get("/merchant-transactions/:merchantId",isLoggedIn,isAdmin,getTransactionOfMerchant)

/**
 * @swagger
 * /admin_api/search-transactions/:
 *   get:
 *     summary: Search transactions by transaction ID or merchant name
 *     description: Retrieve transactions filtered by transaction ID and/or merchant name. Returns a list of matching transactions or an empty array if no matches are found.
 *     tags:
 *       - [AdminOnly]
 *     parameters:
 *       - in: query
 *         name: transaction_id
 *         schema:
 *           type: string
 *           description: The unique identifier of the transaction
 *           example: "TX12345"
 *       - in: query
 *         name: merchant_name
 *         schema:
 *           type: string
 *           description: The name of the merchant associated with the transaction
 *           example: "John Doe"
 *     responses:
 *       200:
 *         description: Successfully retrieved transactions matching the criteria
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   transaction_id:
 *                     type: string
 *                     description: Unique identifier of the transaction
 *                     example: "TX12345"
 *                   original_amount:
 *                     type: number
 *                     format: float
 *                     description: The original amount of the transaction
 *                     example: 100.00
 *                   settled_amount:
 *                     type: number
 *                     format: float
 *                     description: The settled amount of the transaction
 *                     example: 95.00
 *                   status:
 *                     type: string
 *                     description: Status of the transaction
 *                     example: "completed"
 *                   merchant_name:
 *                     type: string
 *                     description: Name of the merchant associated with the transaction
 *                     example: "John Doe"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 *                   example: "Internal Server Error"
 */

router.get("/search-transactions",isLoggedIn,isAdmin,searchTransactions);
export default router;