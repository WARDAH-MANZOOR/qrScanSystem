import { getAllTransactions } from "@prisma/client/sql";
import { getAllProfitAndBalance, getProfitAndBalanceByMerchant, getTransactionOfMerchant, searchTransactions, getMerchants } from "controller/transactions/admin_only.js";
import { Request, Response, Router } from "express";
import prisma from "prisma/client.js";
import CustomError from "utils/custom_error.js";
import { isAdmin, isLoggedIn } from "utils/middleware.js";

let router = Router();

/**
* @swagger
* components:
*  schemas:
*    Merchant:
*      type: object
*      properties:
*        merchant_id:
*          type: integer
*          example: 3
*        full_name:
*          type: string
*          example: "John Doe"
*        phone_number:
*          type: string
*          example: "+1234567890"
*        company_name:
*          type: string
*          example: "Example Company"
*        company_url:
*          type: string
*          nullable: true
*          example: null
*        city:
*          type: string
*          example: "New York"
*        payment_volume:
*          type: number
*          format: float
*          nullable: true
*          example: null
*        user_id:
*          type: integer
*          example: 3
*        commission:
*          type: string
*          example: "0.01"
*    Error:
*      type: object
*      properties:
*        message:
*          type: string
*          example: Internal Server Error 
*/
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
        error = new CustomError("An error occurred while fetching transactions.", 500);
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
router.get("/merchant-transactions/:merchantId", isLoggedIn, isAdmin, getTransactionOfMerchant)

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

router.get("/search-transactions", isLoggedIn, isAdmin, searchTransactions);

/**
 * @swagger
 * /admin_api/profits-balances/:
 *   get:
 *     summary: Retrieve the balance and profit for all merchants within a specific date range
 *     tags:
 *       - [AdminOnly]
 *     description: >
 *       Fetches the total balance and calculated profit for all merchants over a specified time range, 
 *       including daily, weekly, or custom date ranges. The profit is calculated as a percentage of the 
 *       settled amount based on the merchant's commission rate.
 *     parameters:
 *       - in: query
 *         name: range
 *         required: true
 *         schema:
 *           type: string
 *           enum: [daily, weekly, custom]
 *         description: The date range for which to fetch the balance and profit (daily, weekly, or custom).
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: The start date for custom range (required if range is custom).
 *       - in: query
 *         name: endDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: The end date for custom range (required if range is custom).
 *     responses:
 *       200:
 *         description: A list of merchants with their balance and profit
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   merchant_id:
 *                     type: integer
 *                     description: The unique ID of the merchant.
 *                     example: 123
 *                   full_name:
 *                     type: string
 *                     description: The full name of the merchant.
 *                     example: John Doe
 *                   company_name:
 *                     type: string
 *                     description: The name of the merchant's company.
 *                     example: Example Corp
 *                   total_balance:
 *                     type: string
 *                     format: decimal
 *                     description: The total settled balance of the merchant within the specified date range.
 *                     example: "1500.50"
 *                   profit:
 *                     type: string
 *                     format: decimal
 *                     description: The calculated profit for the merchant within the specified date range.
 *                     example: "150.05"
 *       400:
 *         description: Invalid input parameters (e.g., missing required fields)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message explaining the invalid request.
 *                   example: "Range is required"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message explaining the server error.
 *                   example: "Internal Server Error"
 */
router.get("/profits-balances", isLoggedIn, isAdmin, getAllProfitAndBalance);

/**
 * @swagger
 * /admin_api/profit-balance/{merchantId}/:
 *   get:
 *     summary: Retrieve the balance and profit for a specific merchant within a given date range
 *     tags:
 *       - [AdminOnly]
 *     description: >
 *       Fetches the total balance and calculated profit for a specific merchant over a specified time range. 
 *       The profit is calculated as a percentage of the settled amount based on the merchant's commission rate.
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the merchant to retrieve the balance and profit for.
 *         example: 123
 *       - in: query
 *         name: range
 *         required: true
 *         schema:
 *           type: string
 *           enum: [daily, weekly, custom]
 *         description: The date range for which to fetch the balance and profit (daily, weekly, or custom).
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: The start date for custom range (required if range is custom).
 *       - in: query
 *         name: endDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: The end date for custom range (required if range is custom).
 *     responses:
 *       200:
 *         description: Balance and profit details for the specified merchant
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 merchant_id:
 *                   type: integer
 *                   description: The unique ID of the merchant.
 *                   example: 123
 *                 total_balance:
 *                   type: string
 *                   format: decimal
 *                   description: The total settled balance of the merchant within the specified date range.
 *                   example: "1500.50"
 *                 profit:
 *                   type: string
 *                   format: decimal
 *                   description: The calculated profit for the merchant within the specified date range.
 *                   example: "150.05"
 *       400:
 *         description: Invalid input parameters (e.g., missing required fields or invalid merchantId)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message explaining the invalid request.
 *                   example: "Range or merchant id is required"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message explaining the server error.
 *                   example: "Internal Server Error"
 */

router.get("/profit-balance/:merchantId", isLoggedIn, isAdmin, getProfitAndBalanceByMerchant)

/**
 * @swagger
 * /admin_api/merchants/:
 *   get:
 *     summary: Retrieve a list of merchants
 *     description: Fetches all merchants from the database.
 *     tags:
 *       - [AdminOnly]
 *     responses:
 *       200:
 *         description: A list of merchants
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Merchant'
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/merchants", isLoggedIn, isAdmin, getMerchants);
export default router;