import { Router, Request, Response } from 'express';
import prisma from '../../prisma/client.js';  // Assuming Prisma client is set up
import { parseISO, subDays } from 'date-fns';
import { authorize, isLoggedIn, restrict, restrictMultiple } from '../../utils/middleware.js';
import CustomError from '../../utils/custom_error.js';
import { JwtPayload } from 'jsonwebtoken';
import { getTransactionsDaywise } from '@prisma/client/sql';
import { filterTransactions } from 'controller/transactions/analytics.js';
const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Transaction:
 *       type: object
 *       properties:
 *         transaction_id:
 *           type: string
 *           description: Unique transaction ID.
 *           example: "txn_1234567890"
 *         date_time:
 *           type: string
 *           format: date-time
 *           description: Transaction date and time.
 *           example: "2024-10-01T12:34:56Z"
 *         settled_amount:
 *           type: number
 *           description: The settled amount of the transaction.
 *           example: 150.75
 *         status:
 *           type: string
 *           description: Status of the transaction.
 *           enum: [completed, pending, failed]
 *           example: "completed"
 *         response_message:
 *           type: string
 *           description: Message associated with the transaction response.
 *           example: "Transaction successful"
 *     StatusSummary:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           description: Transaction status.
 *           enum: [completed, pending, failed]
 *           example: "completed"
 *         count:
 *           type: integer
 *           description: Number of transactions with this status.
 *           example: 50
 *     Error:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Error message.
 *           example: "Internal Server Error"
 *         statusCode:
 *           type: integer
 *           description: HTTP status code.
 *           example: 500
 */

/**
 * @swagger
 * /transaction_analytics/transactions:
 *   get:
 *     summary: Retrieve a list of transactions or perform a search based on various filters.
 *     tags: [Transactions]
 *     parameters:
 *       - in: query
 *         name: transactionId
 *         schema:
 *           type: string
 *         description: Get a specific transaction by ID.
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter transactions by a specific date.
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter transactions from this date (for date range filtering).
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter transactions up to this date (for date range filtering).
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [completed, pending, failed]
 *         description: Filter transactions by status.
 *       - in: query
 *         name: groupByDay
 *         schema:
 *           type: boolean
 *         description: If true, group transactions by day (for daywise summaries).
 *     responses:
 *       200:
 *         description: List of transactions matching the search filters.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Transaction'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/transactions', isLoggedIn, authorize('Transactions List'), filterTransactions)

 
export default router;
