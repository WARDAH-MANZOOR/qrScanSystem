import { getAllTransactions } from "@prisma/client/sql";
import { Request, Response, Router } from "express";
import prisma from "prisma/client.js";
import CustomError from "utils/custom_error.js";
import { isAdmin, isLoggedIn } from "utils/middleware.js";

let router = Router();

/**
 * @swagger
 * /admin/transactions/:
 *   get:
 *     summary: Retrieve all transactions with profit and merchant details
 *     description: Fetches all transactions from the database along with their original amount, settled amount, calculated profit (original_amount - settled_amount), and the associated merchant's name.
 *     tags:
 *       - Transactions
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

export default router;